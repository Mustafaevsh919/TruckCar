'use strict';
function activity(state,context={}){
 const result=(code,label,burnout=false)=>({code,label,burnout});
 const job=context.service;
 if(job)return result(job.type,job.type==='wash'?'Мойка':job.type==='wheel'?'Замена колеса':'Техническое обслуживание');
 if(context.dragging)return result('dragging','Перетаскивание');
 if(context.critical)return result('repair','Стоит · требуется обслуживание');
 if(state.hood)return result('hood','Стоит · открыт капот');
 if(state.doorLeft||state.doorRight)return result('doors','Стоит · открыта дверь');
 if(context.panelOpen)return result('controls','Стоит · открыто управление');
 if(state.paused)return result('paused','На паузе');
 if(context.turning)return result('turning','Разворачивается');
 if(context.hovered)return result('burnout','Пробуксовка на месте',true);
 if(context.transition)return result('transfer','Переезжает на другую границу');
 return result('driving',context.direction===-1?'Едет влево':'Едет вправо');
}
module.exports={activity};
