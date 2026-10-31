import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const records=new Map(),versions=new Map();
let seq=0;
const store={
  async get(key){return records.has(key)?structuredClone(records.get(key)):null},
  async getWithMetadata(key){return records.has(key)?{data:structuredClone(records.get(key)),etag:String(versions.get(key))}:null},
  async setJSON(key,rec,options={}){
    if(options.onlyIfNew&&records.has(key))return {modified:false};
    if(options.onlyIfMatch&&String(versions.get(key))!==String(options.onlyIfMatch))return {modified:false};
    records.set(key,structuredClone(rec));versions.set(key,++seq);return {modified:true};
  },
  async list({prefix}){return {blobs:[...records.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))}}
};
globalThis.__washaijTestStores={
  getStore:()=>store,
  getDeployStore:()=>store
};

const source=readFileSync(new URL('../netlify/washaij-functions/ghusn-admin.mjs',import.meta.url),'utf8');
assert.ok(source.includes("import { getStore, getDeployStore } from '@netlify/blobs';"),'Known Netlify storage import');
const mocked=source.replace("import { getStore, getDeployStore } from '@netlify/blobs';","const {getStore,getDeployStore}=globalThis.__washaijTestStores;");
const {default: handler}=await import('data:text/javascript;base64,'+Buffer.from(mocked).toString('base64'));

process.env.GHUSN_ADMIN_SECRET='washaij-local-unit-test-password-2026';
const base='https://washaij.example';
async function call(action,method='GET',body=null,cookie=''){
  const options={method,headers:{origin:base,'sec-fetch-site':'same-origin'}};
  if(cookie)options.headers.cookie=cookie;
  if(body!==null){options.headers['content-type']='application/json';options.body=JSON.stringify(body)}
  const result=await handler(new Request(base+'/.netlify/functions/ghusn-admin?action='+action,options),{deploy:{context:'production'}});
  let data;try{data=await result.json()}catch{data=null}
  return {status:result.status,data,headers:result.headers};
}

test('password-gated session, private draft, approval and public visitor overlay',async()=>{
  records.clear();
  const anon=await call('session');
  assert.equal(anon.status,200);
  assert.equal(anon.data.configured,true);
  assert.equal(anon.data.authenticated,false);

  const forbidden=await call('save','POST',{personId:'999999999998',fields:{name:'عينة اختبار'}});
  assert.equal(forbidden.status,401);

  const wrong=await call('login','POST',{username:'admin',password:'incorrect'});
  assert.equal(wrong.status,401);
  const login=await call('login','POST',{username:'admin',password:process.env.GHUSN_ADMIN_SECRET});
  assert.equal(login.status,200);
  assert.equal(login.data.authenticated,true);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.ok(cookie.startsWith('ghusn_editor_session='));

  const personId='999999999998';
  const draft={personId,originalName:'اختبار بنسخة معزولة',fields:{
    name:'اسم اختباري معتمد',birth:'١٤٤٠هـ',death:'',father:'تغيير نسب معلق',
    source:'مرجع اختباري',notes:'تعديل محصور في ذاكرة الاختبار'
  }};
  const saved=await call('save','POST',draft,cookie);
  assert.equal(saved.status,200);
  assert.equal(saved.data.saved,true);
  const privateRead=await call('person','GET',null,cookie);
  // person requires an ID, and must reject requests without one.
  assert.equal(privateRead.status,400);
  const beforeApproval=await call('public');
  assert.deepEqual(beforeApproval.data.items,[]);
  const published=await call('approve','POST',{personId},cookie);
  assert.equal(published.status,200);
  assert.equal(published.data.approved,true);
  assert.ok(published.data.pendingRelations.includes('father'));
  const publicRead=await call('public');
  assert.equal(publicRead.status,200);
  assert.equal(publicRead.data.schema,'washaij-approved-public-v1');
  const item=publicRead.data.items.find(rec=>rec.personId===personId);
  assert.equal(item.fields.name,draft.fields.name);
  assert.equal(item.fields.birth,draft.fields.birth);
  assert.equal(item.fields.notes,draft.fields.notes);
  assert.equal(item.fields.source,draft.fields.source);
  assert.equal('father' in item.fields,false,'Unverified family relations must never be public');
  assert.equal(publicRead.data.items.some(rec=>rec.fields?.password),false);
});

test('the visitor explorer reads the approved API and hides record IDs',()=>{
  const html=readFileSync(new URL('../washaij-site/washaij-core.html',import.meta.url),'utf8');
  assert.ok(html.includes("window.GHOSN_APPLY_APPROVED"),'Approved overlay bridge exists');
  assert.ok(html.includes("action=public"),'Visitor reads public approved API');
  assert.ok(html.includes('washaij-no-record-identifiers'),'Record identifiers are hidden');
  assert.ok(!html.includes("'aria-label':`${n.name}، الرقم التعريفي"),'Accessibility label does not expose ID');
  assert.ok(!html.includes("b.children[1].textContent='#'+p.id"),'Search results do not show ID');
});


test('verified ID-based parent correction updates the child links after two-stage approval',async()=>{
  records.clear();versions.clear();
  const auth=await call('login','POST',{username:'admin',password:process.env.GHUSN_ADMIN_SECRET});
  const cookie=auth.headers.get('set-cookie').split(';')[0];
  const links={fatherId:'79',motherId:'43',childrenIds:[],spouseIds:['81'],lineageType:'marriage',childTypes:{}};
  const saved=await call('save','POST',{personId:'80',originalName:'هيا الزاحم',fields:{name:'هيا الزاحم',source:'اختبار معزول'},links},cookie);
  assert.equal(saved.status,200);
  assert.equal(saved.data.draft.links.motherId,'43');
  const unpublished=await call('public');
  assert.equal(unpublished.data.relations.revision,'base');
  assert.deepEqual(unpublished.data.relations.overrides,{});
  const review=await call('review','POST',{personId:'80'},cookie);
  assert.equal(review.status,200);
  assert.ok(review.data.hasChanges);
  assert.ok(review.data.changes.some(x=>x.person.includes('هيا')&&x.field==='الأم'));
  assert.ok(review.data.changes.some(x=>x.person.includes('إبراهيم')&&x.field==='الأم'));
  const withoutReview=await call('approve','POST',{personId:'80'},cookie);
  assert.equal(withoutReview.status,409);
  const approved=await call('approve','POST',{personId:'80',reviewToken:review.data.token},cookie);
  assert.equal(approved.status,200);
  assert.equal(approved.data.relationsApplied,true);
  const publicData=await call('public');
  assert.equal(publicData.data.relations.overrides['80'].motherId,'43');
  assert.equal(publicData.data.relations.overrides['82'].motherId,'');
  assert.equal(publicData.data.items.find(x=>x.personId==='80').fields.name,'هيا الزاحم');
  assert.equal('mother' in publicData.data.items.find(x=>x.personId==='80').fields,false);
});

test('reject self-links, incompatible parent genders, missing IDs and obsolete reviews',async()=>{
  records.clear();versions.clear();
  const auth=await call('login','POST',{username:'admin',password:process.env.GHUSN_ADMIN_SECRET});
  const cookie=auth.headers.get('set-cookie').split(';')[0];
  const root={fatherId:'79',motherId:'60',childrenIds:['82'],spouseIds:['81'],lineageType:'marriage',childTypes:{}};
  const save=async links=>call('save','POST',{personId:'80',fields:{name:'هيا الزاحم'},links},cookie);
  for(const bad of [{...root,motherId:'80'},{...root,motherId:'81'},{...root,motherId:'999999999997'},{...root,childrenIds:['81']}]){
    assert.equal((await save(bad)).status,200);
    const invalid=await call('review','POST',{personId:'80'},cookie);
    assert.equal(invalid.status,409);
  }
  assert.equal((await save({...root,motherId:'43'})).status,200);
  const review=await call('review','POST',{personId:'80'},cookie);
  assert.equal(review.status,200);
  assert.equal((await save({...root,motherId:'60'})).status,200);
  const stale=await call('approve','POST',{personId:'80',reviewToken:review.data.token},cookie);
  assert.equal(stale.status,409);
  const publicData=await call('public');
  assert.deepEqual(publicData.data.relations.overrides,{});
});
