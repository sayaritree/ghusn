/* غصن — زر التحرير داخل بطاقة الشخص (نسخة مراجعة معزولة).
   المسودات محلية ولا تغيّر الأنساب المنشورة؛ المصادقة الآمنة مرحلة لاحقة. */
(function(){
"use strict";
var API='/.netlify/functions/ghusn-admin';
async function api(action,payload,id){
 const u=API+'?action='+encodeURIComponent(action)+(id?'&id='+encodeURIComponent(id):'');
 const opts=payload?{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}:
 {credentials:'same-origin',cache:'no-store'};
 const r=await fetch(u,opts),v=await r.json();if(!r.ok)throw Error(v.error||'تعذر الاتصال بالخادم');
 return v;
}
var STYLE_ID="ghusn-inline-admin-style";
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
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
 "#gie-verified-links{margin:13px 0;padding:15px;border:1px solid #c9dcd0;border-radius:12px;background:#f7fbf8}",
 "#gie-verified-links h3{font-size:15px;margin:0 0 9px}",
 "#gie-verified-links select{width:100%;max-width:100%;padding:10px;border-radius:8px;border:1px solid #cbdacd;background:#fff;color:#254735;font:12px Tahoma}",
 ".gie-verified-list{min-height:35px;padding:8px;border:1px dashed #bcd4c6;border-radius:8px;background:#fff;display:flex;flex-wrap:wrap;gap:7px;align-content:flex-start}",
 ".gie-link-pill{display:flex;align-items:center;gap:6px;padding:6px;border-radius:7px;background:#edf5ef;font-size:12px;max-width:100%}",
 "#gie-verified-links .gie-link-pill select{width:auto;max-width:160px;padding:5px}",
 "#gie-verified-links button.gie-remove-link{padding:4px 7px;background:#e5eeeb;color:#375c49}",
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
async function edit(card,d,w){
 var person=refOf(card),saved={};
 if(!person.id){w.alert('هذا الشخص لا يحمل معرّفًا مؤكدًا، ولا يمكن تعديل أنسابه.');return}
 try{let current=await api('person',null,person.id);saved=current.draft?.fields||current.approved?.fields||{};saved.__links=current.draft?.links||null}
 catch(err){w.alert('تعذّر جلب المسودة: '+err.message);return}
 var allRows=w.GHOSN_ROWS||[], personId=String(person.id||"");
 var currentLinks=saved.__links||null;

 var row=allRows.find(function(p){return String(p.id)===personId})||(w.GhusnApp?.family?.person(personId)||{});
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
 // These are descriptive legacy text fields. Actual genealogy links are edited by ID below.
 var currentRecord=allRows.find(function(p){return String(p.id)===personId})||row;
 var roster=new Map();
 allRows.forEach(function(p){if(p.id!=null&&!roster.has(String(p.id)))roster.set(String(p.id),p)});
 var parentField=row.gender==='ولد'?'fatherId':'motherId';
 var currentChildren=[...roster.values()].filter(function(p){return String(p[parentField]||'')===personId}).map(function(p){return String(p.id)});
 var currentPartners=new Set();
 allRows.forEach(function(p){
   if(String(p.id)===personId&&p.spouseId)currentPartners.add(String(p.spouseId));
   if(String(p.spouseId||'')===personId)currentPartners.add(String(p.id));
 });
 var baselineLinks={
   fatherId:String(row.fatherId||''),motherId:String(row.motherId||''),
   childrenIds:currentChildren,spouseIds:[...currentPartners],
   lineageType:row.lineageType||'marriage',childTypes:{}
 };
 var startingLinks=saved.__links||baselineLinks;
 var linkChoice={
   fatherId:String(startingLinks.fatherId||''),
   motherId:String(startingLinks.motherId||''),
   childrenIds:new Set((startingLinks.childrenIds||[]).map(String)),
   spouseIds:new Set((startingLinks.spouseIds||[]).map(String)),
   lineageType:startingLinks.lineageType||'marriage',
   childTypes:{...(startingLinks.childTypes||{})}
 };
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
 '<section id="gie-verified-links" class="gie-reviewed-links" aria-label="محرر روابط النسب">'+
 '<h3>روابط الأنساب الموثقة</h3><p class="gie-footnote">اختر الأشخاص من سجلات وشائج؛ الكتابة النصية بالأعلى لا تنشئ أو تحذف صلات نسب. لا تُعرض الأرقام الداخلية.</p>'+
 '<div class="gie-row gie-row-half"><label class="gie-field"><span>الأب المسجل</span><select id="gie-father-select"></select></label>'+
 '<label class="gie-field"><span>الأم المسجلة</span><select id="gie-mother-select"></select></label></div>'+
 '<div class="gie-row gie-row-half"><label class="gie-field"><span>نوع الصلة بالوالدين</span><select id="gie-lineage-type"></select></label>'+
 '<label class="gie-field"><span>إضافة ابن أو ابنة مسجلين</span><select id="gie-add-child"></select></label></div>'+
 '<div id="gie-verified-children" class="gie-verified-list"></div>'+
 '<div class="gie-row gie-row-half"><label class="gie-field"><span>إضافة زوج أو زوجة مسجلين</span><select id="gie-add-partner"></select></label>'+
 '<div id="gie-verified-partners" class="gie-verified-list"></div></div>'+
 '<p class="gie-footnote">لا تُستبدل هوية شخص بمجرد تغيير اسمه. لإنشاء شخص جديد غير موجود في القاعدة، يُضاف أولًا بسجل مستقل ثم يُختار للربط.</p>'+
 '</section>'+
 '<p class="gie-footnote">«حفظ المسودة» للمراجعة فقط. «اعتماد ونشر» يقدّم مقارنة علاقات قبل التأكيد النهائي، ويرفض التضارب والدورات في النسب.</p>'+
 '<div id="gie-review" class="gie-review" hidden></div>'+
 '<div class="gie-actions"><button type="button" id="gie-review-button" class="gie-light">ماذا عدّلت؟</button>'+
 '<div class="gie-actions-end"><button type="button" id="gie-close" class="gie-light">إغلاق</button>'+
 '<button type="submit" id="gie-save">حفظ المسودة</button><button type="button" id="gie-publish">اعتماد ونشر</button></div></div>'+
 '</form></div>';
 d.body.appendChild(overlay);
 var form=overlay.querySelector("#gie-form");
 function textOption(select,label,value){
   var o=d.createElement('option');o.value=value;o.textContent=label;select.appendChild(o);
 }
 var named=[...roster.values()].filter(function(p){return ['ولد','بنت'].includes(p.gender)});
 var duplicateCounts={};
 named.forEach(function(p){duplicateCounts[p.name]=(duplicateCounts[p.name]||0)+1});
 function labelOf(id){
   var p=roster.get(String(id));if(!p)return 'شخص غير مسجل';
   return p.name+(duplicateCounts[p.name]>1?(p.fatherName?' — والده '+p.fatherName:(p.motherName?' — والدته '+p.motherName:'')):'');
 }
 var typeNames={marriage:'نسب من زواج',biological:'نسب بيولوجي دون استنتاج زواج',care:'تبنٍّ أو رعاية',unknown:'صلة خاصة غير محددة'};
 function fillSelect(select,gender,selected,placeholder){
   textOption(select,placeholder,'');
   named.filter(function(p){return String(p.id)!==personId&&(!gender||p.gender===gender)}).sort(function(a,b){return labelOf(a.id).localeCompare(labelOf(b.id),'ar')}).forEach(function(p){
     textOption(select,labelOf(p.id),String(p.id));
   });
   select.value=selected||'';
 }
 var fs=overlay.querySelector('#gie-father-select'),ms=overlay.querySelector('#gie-mother-select');
 fillSelect(fs,'ولد',linkChoice.fatherId,'غير محدد — اختر الأب');
 fillSelect(ms,'بنت',linkChoice.motherId,'غير محدد — اختر الأم');
 fs.onchange=function(){linkChoice.fatherId=fs.value};
 ms.onchange=function(){linkChoice.motherId=ms.value};
 var lineage=overlay.querySelector('#gie-lineage-type');
 Object.entries(typeNames).forEach(function(pair){textOption(lineage,pair[1],pair[0])});
 lineage.value=linkChoice.lineageType;
 lineage.onchange=function(){linkChoice.lineageType=lineage.value};
 var addChild=overlay.querySelector('#gie-add-child'),addPartner=overlay.querySelector('#gie-add-partner');
 function redrawLinks(){
   var kids=overlay.querySelector('#gie-verified-children'),partners=overlay.querySelector('#gie-verified-partners');
   kids.replaceChildren();partners.replaceChildren();addChild.replaceChildren();addPartner.replaceChildren();
   textOption(addChild,'اختر شخصًا لإضافته إلى الأبناء','');
   textOption(addPartner,'اختر شخصًا لإضافته إلى الأزواج','');
   named.filter(function(p){return String(p.id)!==personId&&!linkChoice.childrenIds.has(String(p.id))}).forEach(function(p){textOption(addChild,labelOf(p.id),String(p.id))});
   named.filter(function(p){return String(p.id)!==personId&&!linkChoice.spouseIds.has(String(p.id))&&p.gender!==row.gender}).forEach(function(p){textOption(addPartner,labelOf(p.id),String(p.id))});
   function pill(box,id,set,isChild){
      var wrapper=d.createElement('div');wrapper.className='gie-link-pill';
      var name=d.createElement('span');name.textContent=labelOf(id);wrapper.appendChild(name);
      if(isChild){
        var pick=d.createElement('select');
        Object.entries(typeNames).forEach(function(pair){textOption(pick,pair[1],pair[0])});
        pick.value=linkChoice.childTypes[id]||roster.get(id)?.lineageType||'marriage';
        pick.onchange=function(){linkChoice.childTypes[id]=pick.value};
        wrapper.appendChild(pick);
      }
      var remove=d.createElement('button');remove.type='button';remove.className='gie-remove-link';remove.textContent='إزالة الصلة';
      remove.onclick=function(){set.delete(id);delete linkChoice.childTypes[id];redrawLinks()};
      wrapper.appendChild(remove);box.appendChild(wrapper);
   }
   linkChoice.childrenIds.forEach(function(id){pill(kids,id,linkChoice.childrenIds,true)});
   linkChoice.spouseIds.forEach(function(id){pill(partners,id,linkChoice.spouseIds,false)});
   if(!linkChoice.childrenIds.size)kids.textContent='لم تُحدَّد أبناء أو بنات';
   if(!linkChoice.spouseIds.size)partners.textContent='لم تُحدَّد علاقات زوجية';
 }
 addChild.onchange=function(){if(addChild.value){linkChoice.childrenIds.add(addChild.value);redrawLinks()}};
 addPartner.onchange=function(){if(addPartner.value){linkChoice.spouseIds.add(addPartner.value);redrawLinks()}};
 redrawLinks();
 function relationValues(){
   return {fatherId:linkChoice.fatherId,motherId:linkChoice.motherId,
     childrenIds:[...linkChoice.childrenIds].sort(),spouseIds:[...linkChoice.spouseIds].sort(),
     lineageType:linkChoice.lineageType,
     childTypes:Object.fromEntries([...linkChoice.childrenIds].filter(function(id){return (linkChoice.childTypes[id]||'marriage')!=='marriage'}).map(function(id){return [id,linkChoice.childTypes[id]]}))};
 }
 function sameRelations(a,b){
   return a.fatherId===b.fatherId&&a.motherId===b.motherId&&a.lineageType===b.lineageType&&
     JSON.stringify([...a.childrenIds].sort())===JSON.stringify([...b.childrenIds].sort())&&
     JSON.stringify([...a.spouseIds].sort())===JSON.stringify([...b.spouseIds].sort())&&
     JSON.stringify(a.childTypes||{})===JSON.stringify(b.childTypes||{});
 }
 var reviewSnapshot=null,reviewToken=null;

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
 async function save(){
  var v=values();if(!v.name.trim())throw Error('الاسم الكامل مطلوب');
  var links=relationValues();
  // A plain text edit must not implicitly rewrite existing kinship links.
  var includeLinks=!sameRelations(links,{...baselineLinks,
    childrenIds:[...baselineLinks.childrenIds].sort(),spouseIds:[...baselineLinks.spouseIds].sort()});
  await api('save',{personId:person.id,originalName:person.name,fields:v,links:includeLinks?links:null});
  saved=v;reviewer.hidden=false;reviewer.textContent='حُفظت المسودة مركزيًا. لم تُنشر للزوار.';
  var button=card.querySelector('.ghusn-edit-from-card');
  if(button)button.textContent='✎ تحرير بياناته — مسودة محفوظة';
 }
 form.onsubmit=async function(e){
   e.preventDefault();var button=overlay.querySelector('#gie-save');button.disabled=true;
   try{await save();reviewSnapshot=null;reviewToken=null;overlay.querySelector('#gie-publish').textContent='اعتماد ونشر'}
   catch(err){w.alert('تعذّر الحفظ: '+err.message)}
   finally{button.disabled=false}
 };
 overlay.querySelector('#gie-publish').onclick=async function(){
   this.disabled=true;
   try{
     const snapshot=JSON.stringify({fields:values(),links:relationValues()});
     if(reviewSnapshot && reviewToken && snapshot===reviewSnapshot){
       const result=await api('approve',{personId:person.id,reviewToken:reviewToken});
       const publicData=await api('public');
       w.GHOSN_APPLY_APPROVED?.(publicData.items||[]);
       w.GHOSN_APPLY_RELATIONS?.(publicData.relations);
       reviewer.hidden=false;
       reviewer.textContent=result.relationsApplied?'تم اعتماد العلاقات بعد مراجعة المعرّفات، وأُعيد بناء المشجر.':'نُشرت البيانات المعتمدة في المشجر.';
       reviewSnapshot=null;reviewToken=null;this.textContent='اعتماد ونشر';
       return;
     }
     await save();
     const review=await api('review',{personId:person.id});
     reviewer.hidden=false;
     if(review.changes&&review.changes.length){
       reviewer.textContent='مراجعة نهائية قبل تغيير المشجر:\n'+review.changes.map(function(c){
         return c.person+' — '+c.field+': '+c.before+' ← '+c.after;
       }).join('\n')+'\n\nتحقق من كل صلة، ثم اضغط «تأكيد اعتماد العلاقات» لتنفيذ التغييرات.';
     }else reviewer.textContent='لا توجد تغييرات في روابط القرابة. اضغط «تأكيد اعتماد البيانات» لإتمام النشر.';
     reviewSnapshot=JSON.stringify({fields:values(),links:relationValues()});
     reviewToken=review.token||'no-relation-changes';
     this.textContent=review.hasChanges?'تأكيد اعتماد العلاقات':'تأكيد اعتماد البيانات';
   }catch(err){reviewSnapshot=null;reviewToken=null;w.alert('تعذّر الاعتماد: '+err.message)}
   finally{this.disabled=false}
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
function addCoreEdit(doc,win){
 if(!win.GhusnApp||doc.getElementById('ghusn-admin-edit-current'))return;
 const b=doc.createElement('button');b.id='ghusn-admin-edit-current';
 b.textContent='✎ تحرير الشخص المعروض';
 b.style.cssText='position:fixed;bottom:16px;left:16px;z-index:105;border:1px solid #8abf9d;border-radius:8px;background:#f1fff6;color:#15573a;padding:9px;font:700 12px Tahoma;cursor:pointer';
 b.onclick=()=>{
   const id=String(win.GhusnApp.getCurrent()),p=win.GhusnApp.family.person(id);if(!p)return;
   const card=doc.createElement('section');card.setAttribute('data-person-id',id);
   const h=doc.createElement('h2');h.textContent=win.GhusnApp.family.fullName(p);card.append(h);
   edit(card,doc,win);
 };
 doc.body.appendChild(b);
}
function enable(){
 const frame=document.getElementById('ghusn-app');if(!frame)return;
 const apply=()=>{
   install(frame);
   try{
     const d=frame.contentDocument,w=frame.contentWindow;
     if(!d||!w)return;
     addCoreEdit(d,w);
     if(!d.documentElement.hasAttribute('data-ghusn-core-admin-watcher')){
       d.documentElement.setAttribute('data-ghusn-core-admin-watcher','1');
       new w.MutationObserver(()=>{
         if(w.GhusnApp&&!d.getElementById('ghusn-admin-edit-current'))addCoreEdit(d,w);
       }).observe(d.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
     }
   }catch(e){}
 };
 frame.addEventListener('load',apply);
 if(frame.contentDocument?.readyState==='complete')apply();
}
function start(){
 window.addEventListener('ghusn-admin-authenticated',enable);
 if(window.GhusnAdminAuthenticated)enable();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();