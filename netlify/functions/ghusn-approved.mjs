import { getStore, getDeployStore } from '@netlify/blobs';
/* Read-only public endpoint: exposes APPROVED person annotations only. */
export default async function handler(req,context){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 try{
  const store=context?.deploy?.context==='production'
    ?getStore({name:'ghusn-editor-documents',consistency:'strong'})
    :getDeployStore('ghusn-editor-preview-documents');
  const {blobs}=await store.list({prefix:'approved/'});
  const approved=[];
  for(const {key} of blobs){
    if(!key.startsWith('approved/'))continue;
    const item=await store.get(key,{type:'json',consistency:'strong'});
    if(!item||!/^[0-9]{1,12}$/.test(String(item.personId)))continue;
    const fields={};
    for(const name of ['name','birth','death','source','notes']){
      if(typeof item.fields?.[name]==='string')fields[name]=item.fields[name].slice(0,name==='notes'?5000:1500);
    }
    approved.push({personId:String(item.personId),fields});
  }
  return Response.json({version:1,approved},{headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 }catch(err){
  // Never publish drafts on failures; clients continue with the immutable base tree.
  return Response.json({version:1,approved:[],unavailable:true},{status:503,headers:{'cache-control':'no-store'}});
 }
}