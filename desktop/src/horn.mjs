export class HornPlayer {
 constructor(){
  this.audio=new Audio(new URL('../assets/horn.wav',import.meta.url).href);
  this.audio.preload='auto';this.setVolume(60);
 }
 setVolume(percent){this.audio.volume=Math.max(0,Math.min(1,(Number.isFinite(percent)?percent:60)/100));}
 async play(){this.audio.currentTime=0;await this.audio.play();}
}
