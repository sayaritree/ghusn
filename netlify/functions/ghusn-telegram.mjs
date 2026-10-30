/** Realtime Telegram alerts and privacy-limited usage metrics. */
import { createHmac,timingSafeEqual } from 'node:crypto';
import { encodeMetric,EVENTS } from '../../lib/usage.mjs';
const COOKIE='ghusn_notice_session',AGE=28800;
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const env=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{...HEADERS,...headers}});
const sign=(v,k)=>createHmac('sha256',k).update(v).digest('base64url');
function key(){
 const token=env('TELEGRAM_BOT_TOKEN');
 return token?createHmac('sha256',token).update('ghusn-entry-alerts/session-v1').digest('hex'):'';
}
function cookie(req){
 const pair=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 return pair?pair.slice(COOKIE.length+1):'';
}
function valid(req,k){
 const parts=cookie(req).split('.');
 if(parts.length!==3||parts[0]!=='v1'||!/^\d{10}$/.test(parts[1])||!/^[A-Za-z0-9_-]+$/.test(parts[2]))return false;
 const received=parts[2],expected=sign('v1.'+parts[1],k);
 if(received.length!==expected.length||!timingSafeEqual(Buffer.from(received),Buffer.from(expected)))return false;
 const age=Math.floor(Date.now()/1000)-Number(parts[1]);
 return age>=0&&age<=AGE;
}
function firstParty(req,requireOrigin){
 const origin=req.headers.get('origin');
 if(req.headers.get('x-ghusn-client')!=='1'||(requireOrigin&&!origin))return false;
 try{return !origin||new URL(origin).origin===new URL(req.url).origin;}catch{return false;}
}
function description(event,req,context){
 const title=event==='ghusn_enter'?'غُصن — فتح الشجرة':'وَشَائِج — فتح البوابة';
 const country=context?.geo?.country?.name||context?.geo?.country?.code||'غير متاح';
 const ua=req.headers.get('user-agent')||'';
 const device=/mobile|android|iphone/i.test(ua)?'هاتف':/windows|macintosh|linux/i.test(ua)?'حاسوب':'غير محدد';
 const date=new Date().toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',hour12:false});
 return '🔔 '+title+'\n🕒 '+date+' (الرياض)\n🌍 الدولة التقريبية: '+country+'\n📱 الجهاز: '+device+'\nℹ️ حدث فتح الواجهة، وليس تدقيقًا أمنيًا لتسجيل الدخول.';
}
async function sendAlert(token,chatId,event,req,context){
 try{
  const send=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({chat_id:chatId,text:description(event,req,context),disable_web_page_preview:true}),
   signal:AbortSignal.timeout(6500)
  });
  if(!send.ok)return 'failed';
  const result=await send.json();return result?.ok?'sent':'failed';
 }catch{return 'failed';}
}
async function persist(event,body,req,context,token){
 const item=encodeMetric(event,body,context,req,token);
 if(!item)return;
 const {getStore,getDeployStore}=await import('@netlify/blobs');
 // Deploy previews write ONLY to a deploy-specific store, never production.
 const store=context?.deploy?.published===true?
  getStore('ghusn-free-analytics-v1'):getDeployStore('ghusn-analytics-preview-v1');
 await store.set(item.key,'1');
}
export async function handle(req,context={}){
 const url=new URL(req.url),token=env('TELEGRAM_BOT_TOKEN'),chatId=env('TELEGRAM_CHAT_ID'),k=key();
 if(!k||!chatId)return json({ok:false,error:'not_configured'},503);
 if(url.pathname==='/api/ghusn-notice-session'&&req.method==='GET'){
  if(!firstParty(req,false))return json({ok:false},403);
  const stamp=Math.floor(Date.now()/1000),issued='v1.'+stamp+'.'+sign('v1.'+stamp,k);
  return json({ok:true},200,{'set-cookie':COOKIE+'='+issued+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+AGE});
 }
 if(url.pathname==='/api/ghusn-notice-session'&&req.method==='DELETE'){
  if(!firstParty(req,true))return json({ok:false},403);
  return json({ok:true},200,{'set-cookie':COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
 }
 if(url.pathname!=='/api/ghusn-notice'||req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 if(!firstParty(req,true)||!valid(req,k))return json({ok:false,error:'unauthorized'},403);
 if(!(req.headers.get('content-type')||'').startsWith('application/json'))return json({ok:false,error:'invalid_content_type'},415);
 let body;
 try{const raw=await req.text();if(raw.length>320)return json({ok:false},400);body=JSON.parse(raw);}catch{return json({ok:false},400);}
 if(!EVENTS.has(body?.event))return json({ok:false,error:'invalid_event'},400);
 const metric=encodeMetric(body.event,body,context,req,token);
 if(metric){
  const promise=persist(body.event,body,req,context,token).catch(e=>console.warn('Usage event storage unavailable:',e.message));
  if(typeof context?.waitUntil==='function')context.waitUntil(promise);
  else await promise;
 }
 if(body.event==='session_end')return json({ok:true,alert:'not_applicable'});
 // Never send live Telegram notifications from a preview deployment.
 if(context?.deploy?.published!==true)return json({ok:true,alert:'preview_suppressed'});
 const alert=await sendAlert(token,chatId,body.event,req,context);
 return json({ok:true,alert});
}
export default handle;
export const config={path:['/api/ghusn-notice','/api/ghusn-notice-session'],rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowSize:60,windowLimit:18}};
