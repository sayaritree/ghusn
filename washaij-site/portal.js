
(function(){
'use strict';
const explorer=document.getElementById('explorer');
const panel=document.getElementById('panorama');
const frames={
 az:document.getElementById('azFrame'),
 ab:document.getElementById('abFrame')
};
const back=document.getElementById('returnToExplorer');
const alternate=document.getElementById('otherPanorama');
let current='';
function readRoute(){
const key=new URLSearchParams(location.hash.replace(/^#/,'')).get('panorama');
return key==='az'||key==='ab'?key:'';
}
function scene(kind){
 if(kind!=='az'&&kind!=='ab')kind='';
 current=kind;
 panel.hidden=!kind;
 if(!kind)return;
 const active=frames[kind];
 if(!active.getAttribute('src'))active.setAttribute('src',active.dataset.src);
 for(const [key,frame] of Object.entries(frames))frame.hidden=key!==kind;
 alternate.textContent=kind==='az'?'شاشة عبدالله (النائب)':'شاشة عبدالعزيز (أوسيل)';
 alternate.setAttribute('aria-label',alternate.textContent);
 document.title=kind==='az'?'وشائج 18 | بانوراما عبدالعزيز':'وشائج 18 | بانوراما عبدالله';
}
function updateRoute(kind,mode){
const next=kind?'#panorama='+kind:location.pathname+location.search;
history[mode==='push'?'pushState':'replaceState']({panorama:kind},'',next);
scene(kind);
}
window.addEventListener('message',event=>{
 if(event.source!==explorer.contentWindow)return;
 const msg=event.data;
 if(msg?.type!=='w18-open-panorama')return;
 if(msg.scene!=='az'&&msg.scene!=='ab')return;
 updateRoute(msg.scene,'push');
});
back.addEventListener('click',()=>updateRoute('','replace'));
alternate.addEventListener('click',()=>updateRoute(current==='az'?'ab':'az','replace'));
window.addEventListener('popstate',()=>scene(readRoute()));
window.addEventListener('hashchange',()=>scene(readRoute()));
scene(readRoute());
})();