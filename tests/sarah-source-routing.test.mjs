import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import '../js/government-sources.js';
import handler from '../api/gemini.js';
import selector from '../api/akd-selector.js';
const sources=globalThis.SarahGovernmentSources;
const question='berapa hari cuti rehat tahunan yang layak untuk jawatan gred 41';
function res(){const r=new EventEmitter();r.setHeader=()=>r;r.status=code=>{r.code=code;return r};r.json=data=>{r.data=data;return r};return r;}
function extract(source,name){const start=source.indexOf(name);assert.ok(start>=0);return source.slice(start,source.indexOf('\n}',start)+2);}

test('AKD source scope requires an explicit request and respects exclusions',()=>{
 for(const q of ['berdasarkan AKD Bil 5 2026','ringkaskan arahan kawalna dalamna','senaraikan semua AKD']) assert.equal(sources.isAkdQuery(q),true,q);
 for(const q of [question,'apa syarat kenaikan pangkat','buat kertas kerja kursus','hai Sarah','jangan guna AKD, rujuk JPA','bukan berdasarkan AKD','tanpa merujuk kepada dokumen AKD','without using AKD','do not use AKD']) assert.equal(sources.isAkdQuery(q),false,q);
});
test('browser no longer queries AKD selector for every general message',async()=>{
 const source=readFileSync(new URL('../js/scripts.js',import.meta.url),'utf8');let calls=0;
 const context=vm.createContext({SarahGovernmentSources:sources,fetch:()=>{calls++;throw new Error('Unexpected selector call')}});
 vm.runInContext(extract(source,'function isAkdQuery('),context);
 vm.runInContext(extract(source,'async function getAkdSelectionForSarah(')+'\nglobalThis.select=getAkdSelectionForSarah;',context);
 assert.equal((await context.select(question)).mode,false);
 assert.equal((await context.select('berdasarkan AKD Bil 5')).mode,true);
 assert.equal(calls,0);
});
test('legacy selector rejects general source scope before any network call, with or without RAG',async()=>{
 const oldFetch=globalThis.fetch;const oldToken=process.env.SARAH_RAG_TOKEN,oldUrl=process.env.SARAH_RAG_INDEX_URL;
 globalThis.fetch=()=>{throw new Error('General question must not load AKD')};
 try{
  for(const enabled of [false,true]){
   if(enabled){process.env.SARAH_RAG_INDEX_URL='https://script.google.com/macros/s/test/exec';process.env.SARAH_RAG_TOKEN='mock-token';}
   else{delete process.env.SARAH_RAG_INDEX_URL;delete process.env.SARAH_RAG_TOKEN;}
   const r=res();await selector({method:'POST',body:{query:question}},r);
   assert.equal(r.code,200);assert.equal(r.data.retrieval,'not-requested');assert.deepEqual(r.data.documents,[]);
  }
 }finally{globalThis.fetch=oldFetch;for(const [key,value] of [['SARAH_RAG_TOKEN',oldToken],['SARAH_RAG_INDEX_URL',oldUrl]])value===undefined?delete process.env[key]:process.env[key]=value;}
});
function fixture(){return {version:1,generatedAt:new Date().toISOString(),documents:[{
 id:'akd:incidental',type:'akd',title:'Nota cuti rehat',url:'https://example.gov.my/akd.pdf',audience:'public',status:'reference',revision:'a'.repeat(64),
 chunks:[{id:'p1',text:'Cuti rehat tahunan gred 41 disebut secara sepintas lalu. INCIDENTAL_AKD_FIXTURE',unit:'page',start:1,end:1}]
}]};}
function governmentResult(){return {candidates:[{finishReason:'STOP',content:{parts:[{text:'Rujuk maklumat rasmi JPA. [[I4U_STATUS:ACTIVE]]'}]},groundingMetadata:{
 webSearchQueries:['JPA cuti rehat rasmi'],groundingChunks:[{web:{uri:'https://docs.jpa.gov.my/',title:'Dokumen JPA'}}],
 groundingSupports:[{segment:{startIndex:0,endIndex:24,text:'Rujuk maklumat rasmi JPA.'},groundingChunkIndices:[0]}]
}}]};}
test('screenshot question uses government search despite stale AKD flags, history and matching RAG',async()=>{
 const keys=['GEMINI_API_KEY','I4UMANAGE_GAS_URL','I4UMANAGE_DOC_SECRET','SARAH_RAG_INDEX_URL','SARAH_RAG_TOKEN'];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]])),oldFetch=globalThis.fetch;let modelCalls=0,ragCalls=0;
 Object.assign(process.env,{GEMINI_API_KEY:'mock-only',I4UMANAGE_GAS_URL:'https://script.google.com/macros/s/catalogue/exec',I4UMANAGE_DOC_SECRET:'mock-doc-token',
 SARAH_RAG_INDEX_URL:'https://script.google.com/macros/s/route-regression/exec',SARAH_RAG_TOKEN:'mock-rag-token'});
 globalThis.fetch=async(url,options)=>{
  const u=String(url);
  if(u.includes('route-regression')){ragCalls++;return Response.json(fixture());}
  assert.ok(u.startsWith('https://generativelanguage.googleapis.com/'),'Must not call AKD catalogue, index or PDF');
  modelCalls++;const payload=JSON.parse(options.body);
  assert.ok(payload.tools.some(t=>t.google_search),'Must enable current official search');
  assert.ok(JSON.stringify(payload.system_instruction).includes('docs.jpa.gov.my'));
  assert.ok(!JSON.stringify(payload.system_instruction).includes('MOD ARAHAN KAWALAN DALAMAN JKNT'));
  assert.ok(!JSON.stringify(payload).includes('INCIDENTAL_AKD_FIXTURE'),'Incidental internal content cannot override official source');
  return Response.json(governmentResult());
 };
 try{
  for(const history of [[],[{role:'user',parts:[{text:'terangkan AKD Bil 5'}]},{role:'model',parts:[{text:'Maklumat tidak ditemui dalam dokumen AKD yang disemak.'}]}]]){
   const r=res();await handler({method:'POST',body:{akd_mode:true,akd_selected_ids:['incidental'],contents:[...history,{role:'user',parts:[{text:question}]}]}},r);
   assert.equal(r.code,200);assert.equal(r.data.i4uVerification.mode,'government');
   assert.ok(!r.data.candidates[0].content.parts[0].text.includes('tidak ditemui dalam dokumen AKD'));
   assert.ok(!r.data.i4uVerification.sourceDocuments?.length);
  }
  assert.equal(modelCalls,2);assert.equal(ragCalls,1);
 }finally{globalThis.fetch=oldFetch;for(const k of keys)old[k]===undefined?delete process.env[k]:process.env[k]=old[k];}
});
