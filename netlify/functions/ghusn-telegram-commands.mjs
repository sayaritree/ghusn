/** Private Telegram webhook for /today and /week, authorized by a signed secret and owner's chat ID. */
import { createHmac,timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { formatReport,ranges,reportFromStore } from '../../lib/usage.mjs';
const env=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
const send=async(token,chat,text)=>{
 const response=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({chat_id:chat,text,disable_web_page_preview:true}),
  signal:AbortSignal.timeout(7000)
 });
 return response.ok;
};
export async function processUpdate(req,{store,token,chatId,now=Date.now(),sender=send}={}){
 if(!token||!chatId)return new Response(null,{status:503});
 const secret=createHmac('sha256',token).update('ghusn-stats-webhook-2026').digest('hex');
 const given=req.headers.get('x-telegram-bot-api-secret-token')||'';
 if(given.length!==secret.length||!timingSafeEqual(Buffer.from(given),Buffer.from(secret)))return new Response(null,{status:403});
 if(req.method!=='POST')return new Response(null,{status:405});
 if(Number(req.headers.get('content-length'))>8192)return new Response(null,{status:413});
 let update;
 try{const raw=await req.text();if(raw.length>8192)return new Response(null,{status:413});update=JSON.parse(raw);}catch{return new Response(null,{status:400});}
 const msg=update?.message;
 if(String(msg?.chat?.id)!==String(chatId))return new Response('ok',{status:200});
 if(!Number.isFinite(Number(msg?.date))||Math.abs(Math.floor(now/1000)-Number(msg.date))>1800)return new Response('ok',{status:200});
 const cmd=String(msg.text||'').trim().split(/\s+/)[0].replace(/@\w+$/,'').toLowerCase();
 if(!['/today','/week','/help','/start'].includes(cmd))return new Response('ok',{status:200});
 if(cmd==='/help'||cmd==='/start'){
  await sender(token,chatId,'🌳 مراقب غُصن ووَشَائِج\n/today — إحصاءات اليوم\n/week — آخر 7 أيام\nتصل التقارير اليومية تلقائيًا الساعة 8 صباحًا بتوقيت الرياض.');
  return new Response('ok',{status:200});
 }
 const days=ranges(cmd==='/today'?'today':'week',now);
 const {stats,partial}=await reportFromStore(store,days);
 await sender(token,chatId,formatReport(cmd==='/today'?'إحصاءات اليوم':'إحصاءات آخر 7 أيام',days,stats,partial));
 return new Response('ok',{status:200});
}
export default async function handler(req,context){
 if(!context?.deploy?.published)return new Response(null,{status:404});
 try{return await processUpdate(req,{
  store:getStore('ghusn-free-analytics-v1'),token:env('TELEGRAM_BOT_TOKEN'),chatId:env('TELEGRAM_CHAT_ID')
 });}catch(e){console.error('Telegram report command error:',e.message);return new Response('error',{status:503});}
}
export const config={path:'/api/ghusn-telegram-updates',rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowSize:60,windowLimit:25}};
