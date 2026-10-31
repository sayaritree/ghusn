import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

// All reads and writes require a verified Netlify Identity "admin" role.
// Immutable revisions: never overwrite existing genealogical data.
const respond = (value,status=200) => Response.json(value,{
  status, headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
export default async function(req) {
  const origin=req.headers.get("origin");
  const site=new URL(req.url).origin;
  if(req.method!=="GET"&&req.method!=="POST") return respond({error:"Method not allowed"},405);
  if(origin && origin!==site) return respond({error:"Origin not allowed"},403);
  let user;
  try { user=await getUser(); } catch(_) { return respond({error:"Authentication unavailable"},503); }
  if(!user) return respond({error:"Login required"},401);
  if(!Array.isArray(user.roles)||!user.roles.includes("admin"))return respond({error:"Admin role required"},403);
  const store=getStore({name:"ghusn-admin-revision-drafts-v1",consistency:"strong"});
  if(req.method==="GET") {
    const listing=await store.list({prefix:"drafts/"});
    const revisions=await Promise.all(listing.blobs.slice(-300).map(async ({key})=>{
      const entry=await store.get(key,{type:"json",consistency:"strong"});
      return entry && {key,personId:entry.personId,personName:entry.personName,createdAt:entry.createdAt,status:"draft"};
    }));
    return respond({items:revisions.filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),total:listing.blobs.length});
  }
  const size=Number(req.headers.get("content-length")||0);
  if(size>128000)return respond({error:"Payload too large"},413);
  let payload;try{payload=await req.json()}catch(_){return respond({error:"Invalid JSON"},400)}
  if(!payload||typeof payload!=="object")return respond({error:"Invalid request"},400);
  const allowed=["name","birth","death","father","mother","sons","daughters","brothers","sisters","partners","source","notes"];
  const changes={};
  for(const key of allowed){
    const v=payload.changes?.[key];
    if(v!==undefined){
      if(typeof v!=="string"||v.length>5000)return respond({error:"Invalid field "+key},400);
      changes[key]=v.trim();
    }
  }
  const personId=String(payload.personId||"").trim();
  const personName=String(payload.personName||"").trim();
  if(!/^[0-9]{1,10}$/.test(personId) || personName.length<2 || personName.length>250)return respond({error:"Person ID or name invalid"},400);
  if(!Object.keys(changes).length)return respond({error:"Nothing to save"},400);
  const now=new Date().toISOString(),key="drafts/"+personId+"/"+now.replace(/[:.]/g,"-")+"-"+crypto.randomUUID();
  const revision={personId,personName,changes,createdAt:now,createdBy:user.id,status:"draft",schema:"ghusn-admin-revision-v1"};
  await store.setJSON(key,revision,{onlyIfNew:true});
  return respond({saved:true,key,createdAt:now,status:"draft"},201);
}
