/* غصن — زر التحرير داخل بطاقة الشخص (نسخة مراجعة معزولة).
   المسودات محلية ولا تغيّر الأنساب المنشورة؛ المصادقة الآمنة مرحلة لاحقة. */
(function(){
"use strict";
var STORE="ghusn_inline_admin_drafts_preview_v1";
var STYLE_ID="ghusn-inline-admin-style";
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function drafts(w){try{return JSON.parse(w.localStorage.getItem(STORE)||"{}")}catch(e){return {}}}
function showing(el,w){var r=el.getBoundingClientRect(),c=w.getComputedStyle(el);return r.width>225&&r.height>90&&r.width<w.innerWidth*.98&&r.height<w.innerHeight*.98&&c.display!=="none"&&c.visibility!=="hidden"}
function nameOf(el){
 var els=el.querySelectorAll("h1,h2,h3,h4,.modal-title,.person-title,.profile-name,strong,b");
 for(var i=0;i<els.length;i++){var s=(els[i].textContent||"").trim().replace(/\s*\(\d+\)\s*$/,"");if(s.length>4&&s.length<120&&!/^(الأب|الأم|الزوج|الزوجة|الارتباط|العلاقات|تفاصيل|الأبناء|عرض)/.test(s))return s}
 return "";
}
function personCard(d,w){
 var exact=d.querySelector('#ghosnDetailModal:not([hidden]) .ghosn-modal-dialog');
 if(exact && showing(exact,w) && nameOf(exact)) return exact;
 var sel='dialog[open],[role="dialog"],.person-modal,.person-popup,.person-card,.profile-modal,.modal-content,.person-details,.person-info,.details-modal,.info-card,.node-info,.popup-content';
 var els=d.querySelectorAll(sel);
 for(var i=0;i<els.length;i++){var el=els[i],t=el.textContent||"";if(!el.closest("#ghusn-inline-editor")&&t.length>35&&t.length<5500&&/(الأب|الأم|الأبناء|البنات|الزوج|العلاقات الأسرية|الارتباطات)/.test(t)&&showing(el,w)&&nameOf(el))return el}
 var buttons=d.querySelectorAll("button,[role=button],a");
 for(var j=0;j<buttons.length;j++){
  if(!/عرض العلاقات الأسرية|الارتباطات الأسرية|عرض الروابط الأسرية/.test(buttons[j].textContent||""))continue;
  var p=buttons[j].parentElement;
  for(var n=0;n<9&&p;n++,p=p.parentElement){var v=p.textContent||"";if(v.length>55&&v.length<3500&&showing(p,w)&&nameOf(p))return p}
 }
 return null;
}
function refOf(card){
 var n=nameOf(card),id=String((card.ownerDocument.defaultView||{}).__GHUSN_DETAIL_PERSON_ID||""), nodes=[card,card.querySelector("[data-person-id]"),card.querySelector("[data-personid]"),card.querySelector("[data-node-id]")];
 nodes.forEach(function(el){if(el&&!id)id=el.getAttribute("data-person-id")||el.getAttribute("data-personid")||el.getAttribute("data-node-id")||""});
 var context=(card.innerText||card.textContent||"").replace(/\s+/g," ").slice(0,250);
 return {name:n,id:id,key:id?"id:"+id:"name:"+n+"|"+context.slice(0,120),context:context};
}
function addCss(d){
 if(d.getElementById(STYLE_ID))return;
 var s=d.createElement("style");s.id=STYLE_ID;
 s.textContent=[
 ".ghusn-edit-from-card{display:inline-flex!important;align-items:center;justify-content:center;font:700 13px Tahoma,Arial!important;direction:rtl!important;background:#ecfff4!important;color:#125c3e!important;border:1px solid #86bd9b!important;border-radius:9px!important;padding:9px 12px!important;cursor:pointer!important;margin:8px 4px!important}",
 ".ghusn-edit-from-card:focus-visible{outline:3px solid #1ca26f!important}",
 "#ghusn-inline-editor{position:fixed!important;inset:0!important;z-index:2147483600!important;display:flex!important;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;background:rgba(9,40,28,.42);direction:rtl;font-family:Tahoma,Arial,sans-serif}",
 "#ghusn-inline-editor[hidden]{display:none!important}",
 "#ghusn-inline-editor .gie-panel{background:#fff;color:#1b4334;border-radius:16px;padding:20px 22px;max-width:900px;width:100%;max-height:93vh;overflow:auto;box-shadow:0 16px 65px #11352770;box-sizing:border-box}",
 "#ghusn-inline-editor .gie-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:10px;border-bottom:1px solid #e2ebe5;margin-bottom:14px}",
 "#ghusn-inline-editor h2{font-size:19px;line-height:1.4;margin:0;color:#20563e}",
 "#ghusn-inline-editor .gie-person-title{font-size:12px;color:#627668;margin:5px 0 0}",
 "#ghusn-inline-editor .gie-row{display:grid;gap:12px;margin-bottom:12px;align-items:start}",
 "#ghusn-inline-editor .gie-row-first{grid-template-columns:minmax(0,2.6fr) minmax(105px,.9fr) minmax(105px,.9fr)}",
 "#ghusn-inline-editor .gie-row-half{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}",
 "#ghusn-inline-editor .gie-row-fifth{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)}",
 "#ghusn-inline-editor .gie-row-notes{grid-template-columns:1fr;margin-bottom:8px}",
 "#ghusn-inline-editor .gie-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;min-width:0}",
 "#ghusn-inline-editor .gie-field>span{color:#29553e}",
 "#ghusn-inline-editor input,#ghusn-inline-editor textarea{border:1px solid #d5e1d7;background:#fff;border-radius:8px;padding:9px 10px;font:400 13px Tahoma,Arial,sans-serif;direction:rtl;box-sizing:border-box;width:100%;color:#203c31;min-width:0}",
 "#ghusn-inline-editor .gie-short-date input{font-size:12px;text-align:center;padding-left:5px;padding-right:5px;font-variant-numeric:tabular-nums}",
 "#ghusn-inline-editor .gie-relations textarea{min-height:49px;resize:vertical;line-height:1.7}",
 "#ghusn-inline-editor .gie-row-notes textarea{min-height:72px;resize:vertical}",
 "#ghusn-inline-editor .gie-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:13px}",
 "#ghusn-inline-editor .gie-actions-end{display:flex;align-items:center;gap:8px}",
 "#ghusn-inline-editor button{background:#146f4b;color:#fff;border:0;border-radius:8px;padding:9px 13px;font:700 12px Tahoma,Arial,sans-serif;cursor:pointer}",
 "#ghusn-inline-editor button.gie-light{background:#eff4f1;color:#244b38}",
 "#ghusn-inline-editor .gie-close-top{min-width:30px;min-height:30px;padding:4px 9px;font-size:17px}",
 "#ghusn-inline-editor .gie-review{white-space:pre-wrap;background:#f4f8f5;padding:12px;border-radius:8px;line-height:1.9;font-size:12px;margin-top:10px;border:1px solid #d8eadf}",
 "#ghusn-inline-editor .gie-footnote{font-size:11px;line-height:1.7;color:#687e70;margin:4px 0 0}",
 "@media(max-width:650px){#ghusn-inline-editor .gie-row-first{grid-template-columns:minmax(0,1fr) minmax(90px,.65fr) minmax(90px,.65fr)}#ghusn-inline-editor .gie-panel{padding:14px}#ghusn-inline-editor .gie-row{gap:8px}}",
 "@media(max-width:420px){#ghusn-inline-editor .gie-row-first{grid-template-columns:1fr 1fr}#ghusn-inline-editor .gie-row-first .gie-full-name{grid-column:1/-1}#ghusn-inline-editor .gie-row-half,#ghusn-inline-editor .gie-row-fifth{grid-template-columns:1fr}#ghusn-inline-editor{padding:8px}}"
 ].join("\n");d.head.appendChild(s);
}
function edit(card,d,w){
 var person=refOf(card), saved=drafts(w)[person.key]||{};
 var allRows=w.GHOSN_ROWS||[], personId=String(person.id||"");
 var row=allRows.find(function(p){return String(p.id)===personId})||{};
 var individuals=new Map();
 allRows.forEach(function(p){if(p.id!=null&&!individuals.has(String(p.id)))individuals.set(String(p.id),p)});
 function relationName(p){return String(p.name||p.given||"").trim()}
 var daughters=[],sons=[],brothers=[],sisters=[],partners=[];
 if(personId){
   individuals.forEach(function(p){
     if(String(p.id)===personId)return;
     if(String(p.fatherId||"")===personId || String(p.motherId||"")===personId){
       (p.gender==="بنت"?daughters:sons).push(relationName(p));
     }
     if((row.fatherId && String(p.fatherId||"")===String(row.fatherId)) ||
        (row.motherId && String(p.motherId||"")===String(row.motherId))){
       (p.gender==="بنت"?sisters:brothers).push(relationName(p));
     }
   });
   allRows.forEach(function(p){
     if(String(p.id)===personId&&p.spouseId){
       partners.push(individuals.get(String(p.spouseId))?.name||p.spouseName||"");
     }
     if(String(p.spouseId||"")===personId){
       partners.push(relationName(p));
     }
   });
 }
 function unique(arr){return [...new Set(arr.map(String).map(function(s){return s.trim()}).filter(Boolean))].join("، ")}
 var initial={
    name:String(row.name||person.name),
    birth:String(row.birthH||row.birthG||""),
    death:String(row.deathH||row.deathG||""),
    father:String(row.fatherName||""),
    mother:String(row.motherName||""),
    sons:unique(sons),daughters:unique(daughters),
    brothers:unique(brothers),sisters:unique(sisters),
    partners:unique(partners),source:"",notes:""
 };
 var data={};
 Object.keys(initial).forEach(function(k){data[k]=Object.prototype.hasOwnProperty.call(saved,k)?saved[k]:initial[k]});
 var old=d.getElementById("ghusn-inline-editor");if(old)old.remove();
 var overlay=d.createElement("section");overlay.id="ghusn-inline-editor";
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.setAttribute("aria-label","تحرير بيانات الشخص");
 function textInput(label,key,extra,placeholder){
   return '<label class="gie-field '+(extra||'')+'"><span>'+label+'</span><input name="'+key+'" value="'+esc(data[key])+'" '+(key==='name'?'required ':'')+'placeholder="'+esc(placeholder||"")+'"></label>';
 }
 function area(label,key,rows,extra){
   return '<label class="gie-field '+(extra||'')+'"><span>'+label+'</span><textarea name="'+key+'" rows="'+rows+'">'+esc(data[key])+'</textarea></label>';
 }
 overlay.innerHTML='<div class="gie-panel">'+
 '<div class="gie-header"><div><h2>تحرير بيانات الشخص</h2><p class="gie-person-title">'+esc(person.name)+'</p></div>'+
 '<button type="button" class="gie-light gie-close-top" id="gie-close-top" aria-label="إغلاق بطاقة التحرير">×</button></div>'+
 '<form id="gie-form">'+
 '<div class="gie-row gie-row-first">'+
 textInput("الاسم الكامل","name","gie-full-name","اسم الشخص الكامل")+
 textInput("تاريخ الولادة","birth","gie-short-date","هـ / م")+
 textInput("تاريخ الوفاة","death","gie-short-date","هـ / م")+
 '</div>'+
 '<div class="gie-row gie-row-half">'+
 textInput("الأب","father","","اختر أو اكتب اسم الأب")+
 textInput("الأم","mother","","اختر أو اكتب اسم الأم")+
 '</div>'+
 '<div class="gie-row gie-row-half">'+
 area("الأولاد","sons",2,"gie-relations")+
 area("البنات","daughters",2,"gie-relations")+
 '</div>'+
 '<div class="gie-row gie-row-half">'+
 area("الإخوان","brothers",2,"gie-relations")+
 area("الأخوات","sisters",2,"gie-relations")+
 '</div>'+
 '<div class="gie-row gie-row-fifth">'+
 area("الزوج / الزوجة","partners",2,"gie-relations")+
 textInput("المصدر","source","","مرجع المعلومة")+
 '</div>'+
 '<div class="gie-row gie-row-notes">'+area("ملاحظة","notes",3,"")+'</div>'+
 '<p class="gie-footnote">تعديل أسماء الأقارب يُحفظ كطلب مراجعة، ولا يغيّر روابط النسب تلقائيًا. جميع التعديلات مسودات تجريبية غير منشورة.</p>'+
 '<div id="gie-review" class="gie-review" hidden></div>'+
 '<div class="gie-actions"><button type="button" id="gie-review-button" class="gie-light">ماذا عدّلت؟</button>'+
 '<div class="gie-actions-end"><button type="button" id="gie-close" class="gie-light">إغلاق</button>'+
 '<button type="submit" id="gie-save">حفظ المسودة</button></div></div>'+
 '</form></div>';
 d.body.appendChild(overlay);
 var form=overlay.querySelector("#gie-form");
 function values(){return Object.fromEntries(new w.FormData(form).entries())}
 function close(){overlay.remove()}
 overlay.querySelector("#gie-close").onclick=close;
 overlay.querySelector("#gie-close-top").onclick=close;
 overlay.onmousedown=function(e){if(e.target===overlay)close()};
 var reviewer=overlay.querySelector("#gie-review");
 overlay.querySelector("#gie-review-button").onclick=function(){
   var v=values(),labels={name:"الاسم الكامل",birth:"تاريخ الولادة",death:"تاريخ الوفاة",father:"الأب",mother:"الأم",
     sons:"الأولاد",daughters:"البنات",brothers:"الإخوان",sisters:"الأخوات",partners:"الزوج / الزوجة",source:"المصدر",notes:"ملاحظة"};
   var changes=Object.keys(labels).filter(function(k){return String(v[k]||"")!==String(initial[k]||"")})
     .map(function(k){return labels[k]+": "+(v[k]||"—")});
   reviewer.hidden=false;
   reviewer.textContent=changes.length?"التغييرات المطلوب مراجعتها:\n"+changes.join("\n"):"لا توجد تغييرات عن البيانات الأصلية.";
 };
 form.onsubmit=function(e){
   e.preventDefault();
   var v=values(),all=drafts(w);if(!String(v.name||"").trim())return;
   all[person.key]=Object.assign({},v,{originalName:person.name,personId:person.id||null,
      context:person.context,status:"draft",updatedAt:new Date().toISOString()});
   try{w.localStorage.setItem(STORE,JSON.stringify(all))}
   catch(err){w.alert("تعذّر حفظ المسودة في هذا المتصفح؛ لم تتغير بيانات الشجرة.");return}
   var button=card.querySelector(".ghusn-edit-from-card");
   if(button)button.textContent="✎ تحرير بياناته — مسودة محفوظة";
   close();w.alert("حُفظت المسودة المحلية فقط. لم تتغير بيانات الموقع المنشور.");
 };
 var focus=overlay.querySelector('input[name="name"]');if(focus)focus.focus();
}
function install(frame){
 var d,w;try{d=frame.contentDocument;w=frame.contentWindow;if(!d||!w||!d.body)return}catch(e){return}
 if(d.documentElement.hasAttribute("data-ghusn-admin-bridge"))return;
 d.documentElement.setAttribute("data-ghusn-admin-bridge","1");addCss(d);
 var pending=false;
 function inspect(){
   pending=false;
   var card=personCard(d,w);if(!card)return;
   if(card.hasAttribute("data-ghusn-admin-card")){
     var already=card.querySelector('.ghusn-edit-from-card');
     if(already && !card.closest('#ghosnDetailModal[hidden]')){
       var id=refOf(card).id, current=already.getAttribute('data-ghusn-owner-id');
       if(id && current!==id){already.setAttribute('data-ghusn-owner-id',id);already.textContent='✎ تحرير بياناته';}
     }
     return;
   }
   var item=refOf(card);if(!item.name)return;
   card.setAttribute("data-ghusn-admin-card","1");
   var b=d.createElement("button");b.type="button";b.className="ghusn-edit-from-card";
   b.textContent="✎ تحرير بياناته";b.setAttribute('data-ghusn-owner-id',item.id||'');b.onclick=function(e){e.preventDefault();e.stopPropagation();edit(card,d,w)};
   var footer=card.querySelector(".ghosn-modal-footer"); if(footer)footer.insertBefore(b,footer.firstChild);else card.appendChild(b);
 }
 function schedule(){if(!pending){pending=true;w.requestAnimationFrame(inspect)}}
 var observer=new w.MutationObserver(schedule);
 observer.observe(d.body,{subtree:true,childList:true,attributes:true,attributeFilter:["style","class","hidden","open"]});
 d.addEventListener("click",schedule,true);schedule();
 function scanNested(){
  var frames=d.querySelectorAll("iframe#ws-frame");
  frames.forEach(function(inner){
   if(!inner.hasAttribute("data-ghusn-admin-watched")){
     inner.setAttribute("data-ghusn-admin-watched","1");
     inner.addEventListener("load",function(){install(inner)});
   }
   try{if(inner.contentDocument&&inner.contentDocument.readyState==="complete")install(inner)}catch(e){}
  });
 }
 new w.MutationObserver(scanNested).observe(d.body,{subtree:true,childList:true});
 scanNested();
}
function enableDraftExport(){
 if(document.getElementById("ghusn-export-drafts"))return;
 var box=document.createElement("div");box.id="ghusn-export-drafts";
 box.style.cssText="position:fixed;bottom:14px;right:14px;z-index:2147483590;direction:rtl;font:13px Tahoma;background:white;border:1px solid #a8cab8;border-radius:10px;padding:8px;box-shadow:0 3px 16px #183b2928";
 box.innerHTML='<button type="button" style="border:0;background:#176b49;color:white;border-radius:7px;padding:9px;cursor:pointer;font:700 12px Tahoma">تصدير تعديلات التجربة</button>';
 box.querySelector("button").onclick=function(){
  var frame=document.getElementById("ghusn-app"), inner=frame&&frame.contentWindow, nested;
  try{nested=inner&&inner.document.getElementById("ws-frame");}catch(e){}
  var win=nested&&nested.contentWindow||inner;
  var entries=win?drafts(win):{}, count=Object.keys(entries).length;
  if(!count){window.alert("لا توجد مسودات محفوظة في هذا المتصفح لهذا القسم. افتح قسم وشائج الذي عدلت فيه أولًا.");return}
  var payload={format:"ghusn-local-drafts-v1",exportedAt:new Date().toISOString(),count:count,drafts:entries};
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
  var url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="غصن_مسودات_التحرير_"+new Date().toISOString().slice(0,10)+".json";
  a.click();setTimeout(function(){URL.revokeObjectURL(url)},1500);
 };
 document.body.appendChild(box);
}
function start(){
 if(new URLSearchParams(window.location.search).get("ghusnAdminPreview")!=="1")return;
 var backup=document.createElement('button');
 backup.type='button';backup.textContent='تصدير تعديلاتي التجريبية';
 backup.style.cssText='position:fixed;left:12px;top:120px;z-index:20000;background:#fffdf4;border:1px solid #8db99c;border-radius:10px;color:#215b40;padding:9px;font:700 12px Tahoma;cursor:pointer';
 backup.onclick=function(){
  let data={};try{data=JSON.parse(localStorage.getItem('ghusn_inline_admin_drafts_preview_v1')||'{}')}
  catch(err){alert('تعذر قراءة تعديلات التجربة');return}
  const allowed=['name','birth','death','father','mother','sons','daughters','brothers','sisters','partners','source','notes'];
  const records=[];
  Object.keys(data).forEach(function(k){
    const value=data[k]||{},id=String(value.personId||'');
    if(!/^\d{1,12}$/.test(id))return;
    const fields={};for(const name of allowed)if(typeof value[name]==='string')fields[name]=value[name];
    records.push({personId:id,originalName:String(value.originalName||''),fields:fields});
  });
  if(!records.length){alert('لم أجد مسودات ذات أرقام تعريفية قابلة للتصدير على هذا المتصفح.');return}
  const payload={schema:'ghusn-preview-drafts-v1',exportedAt:new Date().toISOString(),records:records};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='غصن-تعديلات-التجربة.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 };
 document.body.appendChild(backup);
 enableDraftExport();
 var frame=document.getElementById("ghusn-app");if(!frame)return;
 frame.addEventListener("load",function(){install(frame)});
 if(frame.contentDocument&&frame.contentDocument.readyState==="complete")install(frame);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();