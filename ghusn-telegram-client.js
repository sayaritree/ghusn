/* Anonymous, tab-scoped usage statistics. No names, genealogy data or IP. */
(() => {
  'use strict';
  const host=document.getElementById('ghusn-app');
  if(!host)return;
  let wired=null,sessionPromise=null,started=0,sessionId='',reported=false;
  const opts={credentials:'same-origin',headers:{'X-Ghusn-Client':'1'},cache:'no-store'};
  const id=()=>crypto.randomUUID();
  let visitorId;
  try{
    visitorId=sessionStorage.getItem('ghusn-usage-tab')||id();
    sessionStorage.setItem('ghusn-usage-tab',visitorId);
  }catch{visitorId=id();}
  const session=()=>sessionPromise||(sessionPromise=fetch('/api/ghusn-notice-session',opts).then(r=>r.ok).catch(()=>false));
  async function emit(event,extra={}){
    if(!(await session()))return;
    try{
      await fetch('/api/ghusn-notice',{
        method:'POST',credentials:'same-origin',cache:'no-store',keepalive:event==='session_end',
        headers:{'X-Ghusn-Client':'1','Content-Type':'application/json'},
        body:JSON.stringify({event,visitorId,sessionId,...extra})
      });
    }catch{} // Tracking must never interrupt the family tree.
  }
  function closeSession(){
    if(!reported||!started)return;
    reported=false;
    void emit('session_end',{durationSeconds:Math.round((Date.now()-started)/1000)});
    started=0;
  }
  addEventListener('pagehide',closeSession);
  function wire(){
    let doc;
    try{doc=host.contentDocument;}catch{return;}
    if(!doc||wired===doc)return;
    const tree=doc.getElementById('site-root');
    const launch=doc.getElementById('ws-launch');
    if(!tree||!launch){setTimeout(wire,160);return;}
    wired=doc;
    function entered(){
      if(tree.hidden||reported)return;
      sessionId=id();started=Date.now();reported=true;
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
      closeSession();
      setTimeout(()=>{
        sessionPromise=null;
        fetch('/api/ghusn-notice-session',{
          method:'DELETE',credentials:'same-origin',headers:{'X-Ghusn-Client':'1'}
        }).catch(()=>{});
      },250);
    });
  }
  host.addEventListener('load',()=>setTimeout(wire,0));
  if(host.contentDocument?.readyState==='complete')setTimeout(wire,0);
})();

/* Review-only isolated portal adapter; no change to Ghusn data or analytics. */
(()=>{const s=document.createElement('script');s.src='/ghusn-washaij-canonical.js';s.defer=true;document.head.appendChild(s);})();
