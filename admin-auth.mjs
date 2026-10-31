import { getUser,login,logout,handleAuthCallback } from "@netlify/identity";
const qs=new URLSearchParams(location.search);
let current=null, authenticated=false;
async function check(){
  try{await handleAuthCallback()}catch(err){console.warn("Identity callback:",err)}
  try{current=await getUser()}catch(err){current=null}
  authenticated=!!(current&&Array.isArray(current.roles)&&current.roles.includes("admin"));
  window.GHUSN_ADMIN={
    canEdit:authenticated,
    currentUser:current?.email||null,
    async saveDraft(personId,personName,changes){
      if(!authenticated)throw new Error("دخول المدير مطلوب");
      const r=await fetch("/.netlify/functions/ghusn-admin-revisions",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({personId,personName,changes})
      });
      const result=await r.json();if(!r.ok)throw new Error(result.error||"تعذّر الحفظ");
      return result;
    }
  };
  window.dispatchEvent(new Event("ghusn-admin-ready"));
  renderAuth();
}
function msg(s){const el=document.getElementById("auth-message");if(el)el.textContent=s}
function renderAuth(){
 const box=document.getElementById("ghusn-auth-state");if(!box)return;
 const loginForm=document.getElementById("ghusn-login-form");
 const signed=document.getElementById("ghusn-signed");
 if(loginForm)loginForm.hidden=!!current;
 if(signed)signed.hidden=!current;
 if(current){
   box.textContent=authenticated?"تم تسجيل الدخول بصلاحية المدير":"تم تسجيل الدخول، لكن حسابك لا يحمل صلاحية المدير.";
   const email=document.getElementById("ghusn-user-email");if(email)email.textContent=current.email||"";
 }else box.textContent="سجل الدخول بحساب مدير غُصن.";
 const enter=document.getElementById("ghusn-enter-editor");if(enter)enter.hidden=!authenticated;
 const importSection=document.getElementById("ghusn-import-section");if(importSection)importSection.hidden=!authenticated;
}
async function start(){
 const form=document.getElementById("ghusn-login-form");
 if(form){
   form.addEventListener("submit",async e=>{
     e.preventDefault();msg("جارٍ التحقق من بيانات الدخول…");
     const data=new FormData(form);
     try{await login(String(data.get("email")||""),String(data.get("password")||""));form.reset();await check();msg(authenticated?"تم تسجيل الدخول بنجاح.":"يتطلب التحرير صلاحية المدير.")}
     catch(err){msg("تعذّر تسجيل الدخول: "+err.message)}
   });
 }
 const out=document.getElementById("ghusn-logout");
 if(out)out.onclick=async()=>{try{await logout();await check();msg("تم تسجيل الخروج.")}catch(err){msg(err.message)}};
 const file=document.getElementById("ghusn-import-file");
 if(file)file.addEventListener("change",async()=>{
   if(!authenticated)return msg("يجب تسجيل الدخول كمدير.");
   const f=file.files?.[0];if(!f)return;
   try{
     if(f.size>512000)throw new Error("ملف المسودات أكبر من الحد المسموح.");
     const obj=JSON.parse(await f.text());
     if(obj.format!=="ghusn-local-drafts-v1" || !obj.drafts || typeof obj.drafts!=="object")throw new Error("صيغة النسخة غير مدعومة.");
     const list=Object.values(obj.drafts);
     const eligible=list.filter(x=>/^[0-9]{1,10}$/.test(String(x.personId||""))&&x.originalName);
     const missing=list.length-eligible.length;
     if(!confirm("سيتم نقل "+eligible.length+" مسودة إلى مركز المراجعة فقط، دون نشرها. المسودات غير المرتبطة بمعرّف موثق: "+missing+". هل تستمر؟"))return;
     let done=0;
     for(const item of eligible){
       const keys=["name","birth","death","father","mother","sons","daughters","brothers","sisters","partners","source","notes"];
       const changes=Object.fromEntries(keys.filter(k=>typeof item[k]==="string").map(k=>[k,item[k]]));
       try{await window.GHUSN_ADMIN.saveDraft(String(item.personId),String(item.originalName),changes);done++}
       catch(err){msg("تم نقل "+done+" مسودة. توقف النقل: "+err.message);return}
     }
     msg("تم نقل "+done+" مسودة للمراجعة المركزية. لم تُنشر أي تغييرات. "+(missing?"تعذّر نقل "+missing+" مسودة دون معرّف.":""));
   }catch(err){msg("تعذّر استيراد النسخة: "+err.message)}
   finally{file.value=""}
 });
 await check();
 if(!current&&location.hash.includes("invite_token"))msg("أكمل تفعيل الدعوة، ثم سجّل الدخول.");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
