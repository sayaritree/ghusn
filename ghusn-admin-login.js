/* غُصن — دخول المدير ومنطقة إدارة المسودات، ولا يُعرض زر تحرير الأشخاص إلا بعد جلسة خادم صالحة. */
(()=>{'use strict';
const API='/.netlify/functions/ghusn-admin';
async function request(action,body){
 const res=await fetch(API+'?action='+encodeURIComponent(action),
 body?{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:
 {credentials:'same-origin',cache:'no-store'});
 const data=await res.json();
 if(!res.ok)throw Error(data.error||'تعذر الاتصال بخدمة الإدارة');
 return data;
}
let authenticated=false;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toolbar=document.createElement('button');
toolbar.id='ghusn-admin-access';toolbar.type='button';toolbar.textContent='دخول الإدارة';
toolbar.style.cssText='position:fixed;left:12px;top:72px;z-index:20000;background:#fffdf7;border:1px solid #b3d5bd;border-radius:10px;color:#1c6040;padding:7px 10px;font:700 11px Tahoma,Arial;cursor:pointer;box-shadow:0 3px 14px #142a1a19';
function login(){
 document.querySelector('#ghusn-auth-dialog')?.remove();
 const overlay=document.createElement('div');overlay.id='ghusn-auth-dialog';
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;background:#13291e80;padding:18px;direction:rtl;font-family:Tahoma,Arial';
 overlay.innerHTML='<form style="background:#fff;width:min(410px,100%);padding:22px;display:grid;gap:12px;border-radius:16px;box-shadow:0 15px 60px #1237">'+
 '<h3 style="margin:0;color:#216242;font-size:19px">دخول مدير الأنساب</h3>'+
 '<p style="margin:0;font-size:12px;color:#576e5e">دخول المدير مستقل عن حساب المشاهدة العادي.</p>'+
 '<label style="font-size:12px">اسم المستخدم<input name="username" value="admin" readonly style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #c5dacb;border-radius:8px;margin-top:6px"></label>'+
 '<label style="font-size:12px">كلمة المرور<input name="password" autocomplete="current-password" type="password" required style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #c5dacb;border-radius:8px;margin-top:6px"></label>'+
 '<p id="ghusn-auth-error" style="margin:0;color:#b44f43;font-size:12px"></p>'+
 '<div style="display:flex;gap:8px"><button type="submit" style="border:0;background:#196e4b;color:white;border-radius:8px;padding:10px 15px;cursor:pointer">دخول</button>'+
 '<button type="button" id="ghusn-auth-cancel" style="border:0;background:#eaf0eb;border-radius:8px;padding:10px 15px;cursor:pointer">إغلاق</button></div></form>';
 document.body.appendChild(overlay);
 overlay.querySelector('#ghusn-auth-cancel').onclick=()=>overlay.remove();
 overlay.querySelector('form').onsubmit=async e=>{
   e.preventDefault();
   let submit=e.submitter;submit.disabled=true;
   try{
     const vals=Object.fromEntries(new FormData(e.currentTarget).entries());
     await request('login',vals);authenticated=true;overlay.remove();unlock();
   }catch(err){overlay.querySelector('#ghusn-auth-error').textContent=err.message}
   finally{submit.disabled=false}
 };
 overlay.querySelector('input[name="password"]').focus();
}
function download(filename,obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function menu(){
 let existing=document.querySelector('#ghusn-admin-menu');
 if(existing){existing.remove();return}
 const box=document.createElement('div');box.id='ghusn-admin-menu';
 box.style.cssText='position:fixed;left:12px;top:112px;z-index:20001;background:white;border:1px solid #b4cfbb;border-radius:12px;box-shadow:0 14px 35px #14281933;padding:12px;display:grid;gap:8px;direction:rtl;font:12px Tahoma,Arial';
 box.innerHTML='<strong>مدير غُصن</strong><button type="button" id="ga-download">تصدير مسودات الإدارة</button>'+
 '<button type="button" id="ga-import">استيراد تعديلات التجربة</button>'+
 '<button type="button" id="ga-logout">تسجيل الخروج</button>'+
 '<input id="ga-input" type="file" accept=".json,application/json" hidden>';
 document.body.appendChild(box);
 box.querySelectorAll('button').forEach(b=>b.style.cssText='padding:9px;border:1px solid #c9dbcf;border-radius:7px;background:#f6faf7;cursor:pointer;text-align:right;font:12px Tahoma,Arial');
 box.querySelector('#ga-download').onclick=async()=>{try{download('غصن-النسخ-الاحتياطية.json',await request('export'))}catch(err){alert(err.message)}};
 box.querySelector('#ga-import').onclick=()=>box.querySelector('#ga-input').click();
 box.querySelector('#ga-input').onchange=async e=>{
   const file=e.target.files[0];if(!file)return;
   try{
     const obj=JSON.parse(await file.text());
     const records=obj.schema==='ghusn-preview-drafts-v1'?obj.records:
      obj.schema==='ghusn-admin-export-v1'?obj.drafts:null;
     if(!Array.isArray(records))throw Error('هذا الملف ليس نسخة تصدير معتمدة من غُصن');
     if(!confirm('استيراد '+records.length+' تعديلات كمسودات للمراجعة، دون نشرها للزوار؟'))return;
     const res=await request('import',{records});
     alert('تم استيراد '+res.imported+' مسودة. لا تظهر على الشجرة حتى اعتمادها.');
   }catch(err){alert('تعذر الاستيراد: '+err.message)}
   finally{e.target.value=''}
 };
 box.querySelector('#ga-logout').onclick=async()=>{
   try{await request('logout');location.reload()}catch(err){alert(err.message)}
 };
}
function unlock(){
 window.GhusnAdminAuthenticated=true;
 toolbar.textContent='إدارة غُصن';
 window.dispatchEvent(new Event('ghusn-admin-authenticated'));
}
function start(){
 document.body.appendChild(toolbar);
 toolbar.onclick=()=>authenticated?menu():login();
 request('session').then(s=>{if(s.authenticated){authenticated=true;unlock()}})
 .catch(err=>{toolbar.title='تتطلب الإدارة ضبط كلمة مرور المدير في Netlify'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();