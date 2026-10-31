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
 var n=nameOf(card),id="", nodes=[card,card.querySelector("[data-person-id]"),card.querySelector("[data-personid]"),card.querySelector("[data-node-id]")];
 nodes.forEach(function(el){if(el&&!id)id=el.getAttribute("data-person-id")||el.getAttribute("data-personid")||el.getAttribute("data-node-id")||""});
 var context=(card.innerText||card.textContent||"").replace(/\s+/g," ").slice(0,250);
 return {name:n,id:id,key:id?"id:"+id:"name:"+n+"|"+context.slice(0,120),context:context};
}
function addCss(d){
 if(d.getElementById(STYLE_ID))return;
 var s=d.createElement("style");s.id=STYLE_ID;
 s.textContent=[
 '.ghusn-edit-from-card{display:inline-flex!important;align-items:center;justify-content:center;font:700 13px Tahoma,Arial!important;direction:rtl!important;background:#ecfff4!important;color:#125c3e!important;border:1px solid #86bd9b!important;border-radius:9px!important;padding:9px 12px!important;cursor:pointer!important;margin:8px 4px!important}',
 '.ghusn-edit-from-card:focus-visible{outline:3px solid #1ca26f!important}',
 '#ghusn-inline-editor{position:fixed!important;inset:0!important;z-index:2147483600!important;display:flex!important;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(9,40,28,.48);direction:rtl;font-family:Tahoma,Arial,sans-serif}',
 '#ghusn-inline-editor[hidden]{display:none!important}',
 '#ghusn-inline-editor .gie-panel{background:#fff;color:#1b4334;border-radius:16px;padding:22px;max-width:660px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 16px 65px #11352770;box-sizing:border-box}',
 '#ghusn-inline-editor h2{font-size:19px;margin:0 0 8px}',
 '#ghusn-inline-editor p{font-size:12px;color:#5d6b63;line-height:1.8;margin:7px 0 12px}',
 '#ghusn-inline-editor .gie-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
 '#ghusn-inline-editor label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700}',
 '#ghusn-inline-editor input,#ghusn-inline-editor textarea{border:1px solid #d5e1d7;background:#fff;border-radius:8px;padding:11px;font:400 14px Tahoma,Arial;direction:rtl;box-sizing:border-box;width:100%;color:#203c31}',
 '#ghusn-inline-editor textarea{min-height:68px;resize:vertical}',
 '#ghusn-inline-editor .gie-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}',
 '#ghusn-inline-editor button{background:#146f4b;color:#fff;border:0;border-radius:8px;padding:10px 14px;font:700 13px Tahoma,Arial;cursor:pointer}',
 '#ghusn-inline-editor button.gie-light{background:#eff4f1;color:#244b38}',
 '#ghusn-inline-editor .gie-review{white-space:pre-wrap;background:#f4f8f5;padding:12px;border-radius:8px;line-height:1.8;font-size:13px}',
 '@media(max-width:560px){#ghusn-inline-editor .gie-grid{grid-template-columns:1fr}}'
 ].join("\n");d.head.appendChild(s);
}
function edit(card,d,w){
 var person=refOf(card), saved=drafts(w)[person.key]||{};
 var old=d.getElementById("ghusn-inline-editor");if(old)old.remove();
 var overlay=d.createElement("section");overlay.id="ghusn-inline-editor";
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.innerHTML='<div class="gie-panel"><h2>تحرير بيانات الشخص</h2>'+
 '<p><strong>'+esc(person.name)+'</strong> — تعديل الشخص المحدد من بطاقته في الشجرة.</p>'+
 '<p>معاينة مستقلة: لا تُطبق التغييرات على شجرة غُصن المنشورة. تُحفظ كمسودات محلية فقط.</p>'+
 '<form id="gie-form"><div class="gie-grid">'+
 '<label>الاسم الكامل<input name="name" required value="'+esc(saved.name||person.name)+'"></label>'+
 '<label>تاريخ الميلاد<input name="birth" placeholder="هجري أو ميلادي" value="'+esc(saved.birth||"")+'"></label>'+
 '<label>تاريخ الوفاة<input name="death" placeholder="إن كان معروفًا" value="'+esc(saved.death||"")+'"></label>'+
 '<label>الأب — طلب ربط أو تصحيح<input name="father" placeholder="الأب المطلوب" value="'+esc(saved.father||"")+'"></label>'+
 '<label>الأم — طلب ربط أو تصحيح<input name="mother" placeholder="الأم المطلوبة" value="'+esc(saved.mother||"")+'"></label>'+
 '<label>مصدر المعلومة<input name="source" placeholder="مرجع التوثيق" value="'+esc(saved.source||"")+'"></label>'+
 '</div><label style="margin-top:12px">ملاحظات إضافية<textarea name="notes">'+esc(saved.notes||"")+'</textarea></label>'+
 '<div class="gie-review" id="gie-review" hidden></div>'+
 '<div class="gie-actions"><button type="button" id="gie-review-button">ماذا عدّلت؟ — مراجعة</button>'+
 '<button type="submit">حفظ المسودة</button><button type="button" id="gie-close" class="gie-light">إغلاق</button></div></form></div>';
 d.body.appendChild(overlay);
 var form=overlay.querySelector("#gie-form");
 function values(){return Object.fromEntries(new w.FormData(form).entries())}
 function close(){overlay.remove()}
 overlay.querySelector("#gie-close").onclick=close;
 overlay.onmousedown=function(e){if(e.target===overlay)close()};
 overlay.querySelector("#gie-review-button").onclick=function(){
   var val=values(), box=overlay.querySelector("#gie-review"), labels={name:"الاسم",birth:"الميلاد",death:"الوفاة",father:"الأب",mother:"الأم",source:"المصدر",notes:"ملاحظات"};
   var changes=Object.keys(labels).filter(function(k){return String(val[k]||"")!==String(saved[k]||(k==="name"?person.name:""))})
   .map(function(k){return labels[k]+": "+(val[k]||"—")});
   box.hidden=false;box.textContent=changes.join("\n")||"لا توجد تغييرات جديدة";
 };
 form.onsubmit=function(e){
   e.preventDefault();
   var val=values(),all=drafts(w);if(!String(val.name||"").trim())return;
   all[person.key]=Object.assign({},val,{originalName:person.name,personId:person.id||null,
      context:person.context,status:"draft",updatedAt:new Date().toISOString()});
   try{w.localStorage.setItem(STORE,JSON.stringify(all))}catch(err){w.alert("تعذّر حفظ المسودة. لم تتغير الشجرة.");return}
   var button=card.querySelector(".ghusn-edit-from-card");
   if(button)button.textContent="✎ تحرير بياناته — مسودة محفوظة";
   close();w.alert("حُفظت المسودة فقط؛ لم يتغير الموقع المنشور.");
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
   var card=personCard(d,w);if(!card||card.hasAttribute("data-ghusn-admin-card"))return;
   var item=refOf(card);if(!item.name)return;
   card.setAttribute("data-ghusn-admin-card","1");
   var b=d.createElement("button");b.type="button";b.className="ghusn-edit-from-card";
   b.textContent="✎ تحرير بياناته";b.onclick=function(e){e.preventDefault();e.stopPropagation();edit(card,d,w)};
   card.appendChild(b);
 }
 function schedule(){if(!pending){pending=true;w.requestAnimationFrame(inspect)}}
 var observer=new w.MutationObserver(schedule);
 observer.observe(d.body,{subtree:true,childList:true,attributes:true,attributeFilter:["style","class","hidden","open"]});
 d.addEventListener("click",schedule,true);schedule();
}
function start(){
 var frame=document.getElementById("ghusn-app");if(!frame)return;
 frame.addEventListener("load",function(){install(frame)});
 if(frame.contentDocument&&frame.contentDocument.readyState==="complete")install(frame);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();