param([int]$ExcludePid=0, [switch]$Once)
$ErrorActionPreference='Stop'
$source=@'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class TruckWindowEdges {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
  public class Edge { public string id; public int x,y,width,height; }
  delegate bool EnumProc(IntPtr hwnd, IntPtr param);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd,out RECT r);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint p);
  [DllImport("user32.dll",EntryPoint="GetWindowLongW")] static extern int GetWindowLong(IntPtr hwnd,int index);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd,System.Text.StringBuilder s,int n);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int a,out RECT r,int size);
  [DllImport("dwmapi.dll",EntryPoint="DwmGetWindowAttribute")] static extern int DwmGetIntAttribute(IntPtr h,int a,out int r,int size);
  [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr value);
  public static Edge[] Read(int ownPid) {
    try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch(EntryPointNotFoundException) {}
    var edges=new List<Edge>();
    EnumProc callback=delegate(IntPtr h,IntPtr unused) {
      if(!IsWindowVisible(h)||IsIconic(h))return true;
      uint pid;GetWindowThreadProcessId(h,out pid);if(pid==ownPid)return true;
      int style=GetWindowLong(h,-20);if((style&0x80)!=0)return true;
      var name=new System.Text.StringBuilder(256);GetClassName(h,name,name.Capacity);
      string cls=name.ToString();
      if(cls=="Progman"||cls=="WorkerW"||cls=="Shell_TrayWnd"||cls=="Shell_SecondaryTrayWnd")return true;
      int cloaked;if(DwmGetIntAttribute(h,14,out cloaked,4)==0&&cloaked!=0)return true;
      RECT r;if(DwmGetWindowAttribute(h,9,out r,Marshal.SizeOf(typeof(RECT)))!=0&&!GetWindowRect(h,out r))return true;
      int w=r.Right-r.Left,height=r.Bottom-r.Top;
      if(w<140||height<75)return true;
      edges.Add(new Edge{id=h.ToInt64().ToString(),x=r.Left,y=r.Top,width=w,height=height});return true;
    };
    EnumWindows(callback,IntPtr.Zero);GC.KeepAlive(callback);return edges.ToArray();
  }
}
'@
try {
  Add-Type -TypeDefinition $source
  do {
    $edges=@([TruckWindowEdges]::Read($ExcludePid))
    $json=ConvertTo-Json -InputObject @{windows=$edges} -Depth 4 -Compress
    [Console]::Out.WriteLine($json);[Console]::Out.Flush()
    if($Once){break}
    Start-Sleep -Milliseconds 700
  } while($true)
} catch {
  [Console]::Error.WriteLine($_.Exception.Message);exit 1
}
