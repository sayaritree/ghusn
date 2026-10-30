/** Free-tier Telegram digest, 08:00 Riyadh (05:00 UTC) daily. */
import { createHmac } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { cleanupOld,formatReport,ranges,reportFromStore } from '../../lib/usage.mjs';
const env=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
const send=async(token,chatId,text)=>{
 const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true}),
  signal:AbortSignal.timeout(7500)
 });
 if(!r.ok)throw new Error('Telegram HTTP '+r.status);
 return r.json();
};
const register=async(token,url)=>{
 url=(url||'').replace(/^http:/,'https:');
 if(!url||!url.startsWith('https://'))return;
 const secret=createHmac('sha256',token).update('ghusn-stats-webhook-2026').digest('hex');
 const resp=await fetch('https://api.telegram.org/bot'+token+'/setWebhook',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({url:url.replace(/\/$/,'')+'/api/ghusn-telegram-updates',
   secret_token:secret,allowed_updates:['message'],drop_pending_updates:false}),
  signal:AbortSignal.timeout(7000)
 });
 if(!resp.ok)throw new Error('Webhook setup HTTP '+resp.status);
 const result=await resp.json();
 if(!result.ok)throw new Error('Webhook setup rejected');
};
export async function runDigest({store,token,chatId,url,now=Date.now(),fetcher=send,installer=register}={}){
 if(!token||!chatId)return {ok:false,error:'Missing Telegram config'};
 const dailyDays=ranges('yesterday',now);
 const daily=await reportFromStore(store,dailyDays);
 const messages=[formatReport('تقرير غُصن اليومي',dailyDays,daily.stats,daily.partial)];
 // Monday in Riyadh: also send last week's Monday-Sunday summary.
 const riyadhDay=new Date(now+3*3600_000).getUTCDay();
 if(riyadhDay===1){
  const weeklyDays=ranges('previous_week',now);
  const weekly=await reportFromStore(store,weeklyDays);
  messages.push(formatReport('التقرير الأسبوعي لغُصن ووَشَائِج',weeklyDays,weekly.stats,weekly.partial));
 }
 const status=[];
 for(const message of messages){
  const response=await fetcher(token,chatId,message);
  status.push(Boolean(response?.ok));
 }
 // Scheduled functions only run automatically on published deployments.
 try{await installer(token,url);}catch(e){console.warn('Telegram command registration unavailable:',e.message);}
 try{await cleanupOld(store,now,120);}catch(e){console.warn('Usage retention cleanup unavailable:',e.message);}
 return {ok:status.every(Boolean),messages:messages.length,registered:!!url};
}
export default async function handler(_req,context){
 if(!context?.deploy?.published)return new Response(null,{status:204});
 try{
  const result=await runDigest({
   store:getStore('ghusn-free-analytics-v1'),
   token:env('TELEGRAM_BOT_TOKEN'),chatId:env('TELEGRAM_CHAT_ID'),url:context?.site?.url
  });
  return Response.json(result);
 }catch(e){console.error('Daily digest error:',e.message);return Response.json({ok:false},{status:502});}
}
export const config={schedule:'0 5 * * *'};
