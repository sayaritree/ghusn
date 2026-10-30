/** Privacy-minimising telemetry. No raw IP, names, passwords, or search queries. */
import { createHmac, randomUUID } from 'node:crypto';
export const MAX_DAYS=30;
export const EVENTS=new Set(['ghusn_enter','washaij_open','session_end']);
const EVENT_IDS={ghusn_enter:'g',washaij_open:'w',session_end:'x'};
const FROM_IDS={g:'ghusn_enter',w:'washaij_open',x:'session_end'};
const OFFSET=3*3600_000;
export function riyadhDate(offsetDays=0,now=Date.now()){return new Date(now+OFFSET+offsetDays*86400_000).toISOString().slice(0,10);}
export function isoDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'));}
export function classifyDevice(ua=''){if(/tablet|ipad/i.test(ua))return 't';if(/iphone|android|mobile/i.test(ua))return 'm';if(/windows|macintosh|linux/i.test(ua))return 'd';return 'o';}
export function normalizeCountry(value){return typeof value==='string'&&/^[A-Z]{2}$/.test(value.toUpperCase())?value.toUpperCase():'ZZ';}
export function safeSessionId(value){return typeof value==='string'&&/^[a-zA-Z0-9-]{8,64}$/.test(value)?value:'';}
export function encodeMetric(event,body,context,request,token,now=Date.now()){
  if(!EVENTS.has(event)||!token)return null;
  const day=riyadhDate(0,now),session=safeSessionId(body?.sessionId);
  const visitor=safeSessionId(body?.visitorId)||session;
  if(!session||!visitor)return null;
  const hash=v=>createHmac('sha256',token).update('ghusn-analytics-v1:'+v).digest('hex').slice(0,20);
  const c=normalizeCountry(context?.geo?.country?.code||'ZZ');
  const d=classifyDevice(request?.headers?.get?.('user-agent')||'');
  const duration=event==='session_end'?Math.min(21600,Math.max(0,Math.floor(Number(body?.durationSeconds)||0))):0;
  return {key:day+'/'+randomUUID()+'~'+({ghusn_enter:'g',washaij_open:'w',session_end:'x'}[event])+'~'+hash(visitor)+'~'+hash(session)+'~'+c+'~'+d+'~'+duration,day,event};
}
export function parseMetricKey(key){
  const m=/^(\d{4}-\d{2}-\d{2})\/[\da-f-]{36}~([gwx])~([0-9a-f]{20})~([0-9a-f]{20})~([A-Z]{2})~([mtdo])~(\d{1,5})$/.exec(key||'');
  if(!m)return null;
  return {day:m[1],event:FROM_IDS[m[2]],visitor:m[3],session:m[4],country:m[5],device:m[6],duration:Number(m[7])};
}
export function summarize(keys,days=[]){
  let ghusn=0,washaij=0,completed=0,durationSum=0,skipped=0;
  const visitors=new Set(),sessions=new Set(),countries={},devices={};
  for(const key of keys){
    const row=parseMetricKey(key);
    if(!row||days.length&&!days.includes(row.day)){skipped++;continue;}
    if(row.event==='ghusn_enter'){
      ghusn++;visitors.add(row.visitor);sessions.add(row.session);
      countries[row.country]=(countries[row.country]||0)+1;
      devices[row.device]=(devices[row.device]||0)+1;
    }else if(row.event==='washaij_open')washaij++;
    else if(row.event==='session_end'&&row.duration>0){completed++;durationSum+=row.duration;}
  }
  return {ghusn,washaij,visitors:visitors.size,sessions:sessions.size,
    avgSeconds:completed?Math.round(durationSum/completed):null,completed,countries,devices,skipped};
}
export const countryLabel=c=>({SA:'السعودية',US:'الولايات المتحدة',DE:'ألمانيا',AE:'الإمارات',KW:'الكويت',QA:'قطر',BH:'البحرين',OM:'عُمان',EG:'مصر',TR:'تركيا',ZZ:'غير محدد'}[c]||c);
export const deviceLabel=d=>({m:'هاتف',t:'جهاز لوحي',d:'كمبيوتر',o:'غير محدد'}[d]||d);
export function formatReport(title,days,stats,partial=false){
 const ranked=(obj,label,max=4)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,max).map(([k,n])=>'• '+label(k)+': '+n).join('\n')||'لا توجد بيانات';
 return [
  '📊 '+title,'📆 '+(days.length>1?days[0]+' إلى '+days[days.length-1]:days[0]),'',
  '🌳 فتح غُصن: '+stats.ghusn,'🌿 فتح وَشَائِج: '+stats.washaij,
  '👥 الجلسات المختلفة تقديريًا: '+stats.visitors,
  '⏱ متوسط مدة الجلسات المكتملة: '+(stats.avgSeconds===null?'غير متاح':Math.max(1,Math.round(stats.avgSeconds/60))+' دقيقة'),'',
  '🌍 البلدان (حسب فتح غُصن):',ranked(stats.countries,countryLabel),'',
  '📱 الأجهزة:',ranked(stats.devices,deviceLabel),'',
  'ℹ️ الأعداد إحصاءات استخدام تقريبية، وليست دليلًا على هوية الزائر أو صحة تسجيل الدخول.',
  '🔒 لا تُحفظ أسماء الأفراد أو عناوين IP أو عمليات البحث.',
  ...(partial?['⚠️ تجاوزت الزيارات حد قراءة التقرير؛ قد تكون الأعداد ناقصة.']:[])
 ].join('\n');
}
export function ranges(kind,now=Date.now()){
 if(kind==='today')return [riyadhDate(0,now)];
 if(kind==='yesterday')return [riyadhDate(-1,now)];
 if(kind==='week')return Array.from({length:7},(_,i)=>riyadhDate(-6+i,now));
 if(kind==='previous_week')return Array.from({length:7},(_,i)=>riyadhDate(-7+i,now));
 throw new Error('Unsupported range');
}
/** Read blob key indexes only, not contents; bounded for free-tier usage. */
export async function reportFromStore(store,days,{maxEvents=3500}={}){
 const keys=[];let partial=false;
 for(const day of days){
  const response=await store.list({prefix:day+'/'});
  for(const blob of response.blobs||[]){
   if(keys.length>=maxEvents){partial=true;break;}
   keys.push(blob.key);
  }
  if(partial)break;
 }
 return {stats:summarize(keys,days),partial};
}
export async function cleanupOld(store,now=Date.now(),maxDeletes=120){
 const cutoff=riyadhDate(-MAX_DAYS,now);
 const response=await store.list({directories:true});
 const dirs=(response.directories||[]).map(v=>typeof v==='string'?v:v?.key||'')
  .filter(v=>isoDate(v.replace(/\/$/,''))&&v.replace(/\/$/,'')<cutoff).sort();
 let removed=0;
 for(const dir of dirs){
  const old=await store.list({prefix:dir.replace(/\/$/,'')+'/'});
  for(const {key} of old.blobs||[]){
   if(removed>=maxDeletes)return removed;
   await store.delete(key);removed++;
  }
 }
 return removed;
}
