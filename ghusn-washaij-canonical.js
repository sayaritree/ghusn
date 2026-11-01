/* Review-only Washaij portal adapter: the published Ghusn tree is unchanged.
 * Single canonical Washaij app, rather than a stale embedded HTML snapshot.
 */
(() => {
  'use strict';
  const WASHAIJ_URL='https://washaij-sayaritree2.netlify.app/';
  const host=document.getElementById('ghusn-app');
  if(!host)return;
  const wired=new WeakSet();
  function wire(){
    let doc;
    try{doc=host.contentDocument;}catch{return;}
    if(!doc || wired.has(doc))return;
    const launch=doc.getElementById('ws-launch');
    const modal=doc.getElementById('ws-portal');
    const frame=doc.getElementById('ws-frame');
    const curtain=doc.getElementById('ws-curtain');
    if(!launch || !modal || !frame)return;
    wired.add(doc);
    let previous=null;
    launch.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      previous=doc.activeElement;
      frame.removeAttribute('srcdoc');
      if(frame.getAttribute('src')!==WASHAIJ_URL)frame.setAttribute('src',WASHAIJ_URL);
      modal.hidden=false;
      doc.body.style.overflow='hidden';
      curtain?.classList.add('done');
      // Some hosting policies block cross-origin frames: offer a usable fallback.
      if(!modal.querySelector('#ws-direct-link')){
        const link=doc.createElement('a');
        link.id='ws-direct-link';
        link.href=WASHAIJ_URL;
        link.target='_blank';
        link.rel='noopener noreferrer';
        link.textContent='فتح وشائج مباشرة إذا لم تظهر هنا';
        link.style.cssText='position:absolute;left:12px;bottom:12px;z-index:2147483500;background:#fff;color:#145c43;padding:8px 12px;border-radius:10px;font:700 13px Tahoma,Arial;text-decoration:none;border:1px solid #b3d5bd';
        modal.appendChild(link);
      }
      doc.getElementById('ws-close')?.focus({preventScroll:true});
    },true);
  }
  host.addEventListener('load',()=>setTimeout(wire,0));
  if(host.contentDocument?.readyState==='complete')setTimeout(wire,0);
})();
