import { getStore, getDeployStore } from '@netlify/blobs';
import { createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto';

/*
 * غُصن — إدارة الأنساب. لا تحفظ كلمة مرور في الواجهة أو مستودع GitHub.
 * يُضبط GHUSN_ADMIN_SECRET (قيمة عشوائية طويلة لا تقل عن 18 حرفًا) في
 * Netlify > Environment Variables > Functions.
 * يحفظ الخادم المسودات والنسخ المعتمدة بمعرّفات الأشخاص، لا بالأسماء.
 */
const COOKIE='ghusn_editor_session';
const MAX_AGE=8*60*60;
const ALLOWED=['name','birth','death','father','mother','sons','daughters','brothers','sisters','partners','source','notes'];
const PUBLIC=['name','birth','death','source','notes'];
const ID_RE=/^[0-9]{1,12}$/;

function secret(){
  const s=globalThis.Netlify?.env?.get?.('GHUSN_ADMIN_SECRET')||process.env.GHUSN_ADMIN_SECRET||'';
  return s.length>=18?s:'';
}
function respond(obj,status=200,headers={}){
  return new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8',
  'cache-control':'private, no-store, max-age=0','x-content-type-options':'nosniff',...headers}});
}
function originOK(req){
  const origin=req.headers.get('origin');
  const sameSite=req.headers.get('sec-fetch-site');
  return !!origin && origin===new URL(req.url).origin && (!sameSite||sameSite==='same-origin'||sameSite==='none');
}
function secureEqual(a,b){
  const h1=createHash('sha256').update(String(a)).digest();
  const h2=createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(h1,h2);
}
function signature(secret,payload){
  return createHmac('sha256',secret).update('ghusn-session-v1|'+payload).digest('base64url');
}
function authCookie(s){
  const token=Buffer.from(JSON.stringify({v:1,exp:Date.now()+MAX_AGE*1000,nonce:randomUUID()})).toString('base64url');
  return token+'.'+signature(s,token);
}
function authenticated(req,s){
  if(!s)return false;
  const cookie=req.headers.get('cookie')||'';
  const token=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token)return false;
  const index=token.lastIndexOf('.');if(index<0)return false;
  const payload=token.slice(0,index), sig=token.slice(index+1);
  if(!secureEqual(sig,signature(s,payload)))return false;
  try{
    const obj=JSON.parse(Buffer.from(payload,'base64url').toString());
    return obj.v===1&&Number.isFinite(obj.exp)&&Date.now()<obj.exp;
  }catch{return false}
}
function sessionCookie(val,expire=false){
  return COOKIE+'='+val+'; Path=/; Secure; HttpOnly; SameSite=Strict; '+(expire?'Max-Age=0':'Max-Age='+MAX_AGE);
}
function storeFor(context){
  // Preview stores are DEPLOY-SCOPED; they cannot mutate the live site store.
  if(context?.deploy?.context==='production')
    return getStore({name:'ghusn-editor-documents',consistency:'strong'});
  return getDeployStore('ghusn-editor-preview-documents');
}
function idOf(x){const id=String(x??'');return ID_RE.test(id)?id:null}
function fieldsOf(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('الحقول غير صحيحة');
  const result={};
  for(const key of ALLOWED){
    const val=value[key];
    if(val===undefined)continue;
    if(typeof val!=='string')throw Error('قيمة غير نصية: '+key);
    const clean=val.trim();
    if(clean.length>(key==='notes'?5000:key==='source'?1500:2000))throw Error('تجاوز طول الحقل: '+key);
    result[key]=clean;
  }
  return result;
}
async function readObject(store,key){return await store.get(key,{type:'json',consistency:'strong'})}
async function entryList(store,prefix){
  const {blobs}=await store.list({prefix});
  const result=[];
  for(const item of blobs){
    if(!item.key.startsWith(prefix))continue;
    const obj=await readObject(store,item.key);
    if(obj)result.push(obj);
  }
  return result;
}
function sanitizeRecord(p){
  const id=idOf(p?.personId||p?.id), fields=fieldsOf(p?.fields||p||{});
  if(!id)throw Error('رقم الشخص غير صحيح');
  if(fields.name!==undefined&&!fields.name)throw Error('لا يمكن حفظ اسم فارغ');
  return {personId:id,originalName:String(p.originalName||'').slice(0,250),
    fields,updatedAt:new Date().toISOString(),status:'draft'};
}
async function audit(store,id,record,action){
  // Immutable events: no read-modify-write on a single blob key.
  await store.setJSON('history/'+id+'/'+Date.now()+'-'+randomUUID(),{
    action,personId:id,createdAt:new Date().toISOString(),record
  });
}
export default async function handler(req,context){
  const s=secret(),url=new URL(req.url),action=url.searchParams.get('action')||'session';
  if(!s && !(action==='public' && req.method==='GET'))return respond({configured:false,authenticated:false,error:'يلزم إعداد كلمة مرور الإدارة في إعدادات Netlify.'},503);
  if(req.method!=='GET'&&req.method!=='POST')return respond({error:'طريقة الطلب غير مسموحة'},405);
  if(req.method==='POST'&&!originOK(req))return respond({error:'طلب غير مصرح به من مصدر خارجي'},403);
  if(action==='login'&&req.method==='POST'){
    let body;try{body=await req.json()}catch{return respond({error:'طلب غير صحيح'},400)}
    if(body.username!=='admin'||typeof body.password!=='string'||!secureEqual(body.password,s))
      return respond({error:'اسم المستخدم أو كلمة المرور غير صحيحين'},401);
    return respond({authenticated:true},200,{
      'set-cookie':sessionCookie(authCookie(s))
    });
  }
  if(action==='session'&&req.method==='GET')return respond({configured:true,authenticated:authenticated(req,s)});
  if(action==='public'&&req.method==='GET'){
    let store;try{store=storeFor(context)}catch(_){return respond({error:'تعذر قراءة البيانات المعتمدة'},503)}
    const approved=await entryList(store,'approved/');
    return respond({schema:'washaij-approved-public-v1',items:approved.map(item=>({
      personId:item.personId,
      fields:Object.fromEntries(PUBLIC.filter(k=>typeof item.fields?.[k]==='string').map(k=>[k,item.fields[k]])),
      approvedAt:item.approvedAt
    }))});
  }

  if(!authenticated(req,s))return respond({error:'يجب دخول المدير أولًا'},401);
  if(action==='logout'&&req.method==='POST')return respond({authenticated:false},200,{'set-cookie':sessionCookie('',true)});
  let store;try{store=storeFor(context)}catch(e){return respond({error:'تعذّر الاتصال بالتخزين'},503)}
  if(action==='person'&&req.method==='GET'){
    const id=idOf(url.searchParams.get('id'));if(!id)return respond({error:'رقم غير صحيح'},400);
    const [draft,approved]=await Promise.all([readObject(store,'draft/'+id),readObject(store,'approved/'+id)]);
    return respond({personId:id,draft,approved});
  }
  if(action==='list'&&req.method==='GET'){
    const [drafts,approved]=await Promise.all([entryList(store,'draft/'),entryList(store,'approved/')]);
    return respond({drafts,approved});
  }
  if(action==='export'&&req.method==='GET'){
    const drafts=await entryList(store,'draft/');
    return respond({schema:'ghusn-admin-export-v1',exportedAt:new Date().toISOString(),drafts});
  }
  if(req.method!=='POST')return respond({error:'طلب غير معروف'},404);
  let body;try{body=await req.json()}catch{return respond({error:'بيانات غير صحيحة'},400)}
  if(action==='save'){
    let rec;try{rec=sanitizeRecord(body)}catch(e){return respond({error:e.message},400)}
    await audit(store,rec.personId,rec,'save');
    await store.setJSON('draft/'+rec.personId,rec);
    return respond({saved:true,personId:rec.personId,draft:rec});
  }
  if(action==='import'){
    if(!Array.isArray(body.records)||body.records.length>500)return respond({error:'عدد السجلات غير صحيح'},400);
    // Validate the entire batch before writing anything, preventing a partial import.
    let records;
    try{records=body.records.map(sanitizeRecord)}catch(e){return respond({error:e.message},400)}
    for(const rec of records){
      await audit(store,rec.personId,rec,'import');
      await store.setJSON('draft/'+rec.personId,rec);
    }
    return respond({imported:records.length,mode:'draft-only'});
  }
  if(action==='approve'){
    const id=idOf(body.personId);if(!id)return respond({error:'رقم الشخص غير صحيح'},400);
    const draft=await readObject(store,'draft/'+id);
    if(!draft)return respond({error:'لا توجد مسودة محفوظة لهذا الشخص'},404);
    // Keep unverified genealogy requests PRIVATE until explicit ID-based kinship verification.
    const publishedFields={};
    for(const key of PUBLIC)if(draft.fields[key]!==undefined)publishedFields[key]=draft.fields[key];
    if(!publishedFields.name)return respond({error:'الاسم الكامل مطلوب قبل الاعتماد'},400);
    const previous=await readObject(store,'approved/'+id);
    const approved={personId:id,originalName:draft.originalName||'',
      fields:publishedFields,approvedAt:new Date().toISOString(),status:'approved'};
    await audit(store,id,{previous,approved},'approve');
    await store.setJSON('approved/'+id,approved);
    return respond({approved:true,personId:id,fieldsPublished:PUBLIC,
      pendingRelations:ALLOWED.filter(k=>!PUBLIC.includes(k)&&draft.fields[k]!==undefined),
      note:'تُعرض الأسماء والتواريخ والمصدر والملاحظة بعد تحديث الموقع. روابط الأقارب تحتاج مطابقة بمعرّفاتهم.'});
  }
  return respond({error:'الإجراء غير معروف'},404);
}
export const config={
  rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:100}
};