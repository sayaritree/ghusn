/* غُصن ← وشائج: مدخل واحد للنسخة المستقلة، بلا نسخة HTML مضمنة قديمة.
 * التنقل في الصفحة الرئيسية يحفظ عمل الإدارة ولا يعزل تسجيل الدخول داخل iframe.
 */
(() => {
  'use strict';
  const canonical='https://washaij-sayaritree2.netlify.app/';
  const host=document.getElementById('ghusn-app');
  if(!host)return;
  const connected=new WeakSet();
  function attach(){
    let inner;
    try{inner=host.contentDocument;}catch{return;}
    if(!inner||connected.has(inner))return;
    const portal=inner.getElementById('ws-launch');
    if(!portal)return;
    connected.add(inner);
    portal.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      // Open the real current Washaij (including its own admin page).
      // Navigation rather than a third-party iframe avoids blocked cookies/CSP.
      window.location.assign(canonical);
    },true);
  }
  host.addEventListener('load',attach);
  if(host.contentDocument?.readyState==='complete')attach();
})();
