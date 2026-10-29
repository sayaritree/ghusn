/* Ghusn/Washaij entry notifications. No passwords or genealogical data are transmitted. */
(() => {
  'use strict';
  const host=document.getElementById('ghusn-app');
  if(!host)return;
  let wired=null,sessionPromise=null;
  const opts={credentials:'same-origin',headers:{'X-Ghusn-Client':'1'},cache:'no-store'};
  const session=()=>sessionPromise||(sessionPromise=fetch('/api/ghusn-notice-session',opts).then(r=>r.ok).catch(()=>false));
  async function emit(event){
    if(!(await session()))return;
    try{await fetch('/api/ghusn-notice',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'X-Ghusn-Client':'1','Content-Type':'application/json'},
      body:JSON.stringify({event})
    });}catch{} // A failed alert never interrupts the family tree.
  }
  function wire(){
    let doc;
    try{doc=host.contentDocument;}catch{return;}
    if(!doc||wired===doc)return;
    const tree=doc.getElementById('site-root');
    const launch=doc.getElementById('ws-launch');
    if(!tree||!launch){setTimeout(wire,160);return;}
    wired=doc;
    let reported=false;
    function entered(){
      if(tree.hidden||reported)return;
      reported=true;
      void emit('ghusn_enter');
    }
    const observer=new MutationObserver(entered);
    observer.observe(tree,{attributes:true,attributeFilter:['hidden']});
    entered();
    let lastClick=0;
    launch.addEventListener('click',()=>{
      if(tree.hidden)return;
      const now=Date.now();if(now-lastClick<1800)return;lastClick=now;
      void emit('washaij_open');
    });
    doc.getElementById('logout')?.addEventListener('click',()=>{
      reported=false;
      sessionPromise=null;
      fetch('/api/ghusn-notice-session',{
        method:'DELETE',credentials:'same-origin',headers:{'X-Ghusn-Client':'1'}
      }).catch(()=>{});
    });
  }
  host.addEventListener('load',()=>setTimeout(wire,0));
  if(host.contentDocument?.readyState==='complete')setTimeout(wire,0);
})();