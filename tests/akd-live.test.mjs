import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createAkdLibrary, selectLiveAkd} from '../lib/sarah-akd-live.js';
import {createUniversalSearch} from '../lib/sarah-universal-search.js';
import handler from '../api/gemini.js';
import selector from '../api/akd-selector.js';
const core = globalThis.SarahUniversalCore;
const env = {I4UMANAGE_GAS_URL:'https://script.google.com/macros/s/live-test/exec', I4UMANAGE_DOC_SECRET:'test-only-secret'};
const entry = (id='new-akd', name='AKD BIL 5 2026 KAWALAN PERBELANJAAN.pdf', updatedAt='2026-11-03T07:37:30.000Z') =>
    ({id,name,updatedAt,url:`https://drive.google.com/file/d/${id}/view`,mimeType:'application/pdf',size:100,year:'2026'});
function res() {const r = new EventEmitter();r.setHeader=()=>r;r.status=n=>{r.code=n;return r};r.json=d=>{r.data=d;return r};return r;}
const req = text => ({method:'POST',body:{contents:[{role:'user',parts:[{text}]}]}});
const model = text => Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]});

test('exact screenshot request routes to catalogue without treating senaraikan as a keyword', () => {
    for (const q of ['senaraikan semua AKD','senarai dokumen AKD','list all AKD documents','tolong tunjuk semua AKD','apa dokumen AKD yang ada']) {
        assert.equal(core.isIntent(q),true,q);assert.equal(core.isCatalogRequest(q),true,q);
        assert.equal(core.parse({q}).type,'akd');assert.deepEqual(core.parse({q}).terms,[]);
    }
    for (const q of ['senaraikan tanggungjawab pegawai dalam AKD','senaraikan tanggungjawab dalam semua dokumen AKD','senaraikan syarat cuti','ringkaskan AKD 5 2026']) assert.equal(core.isCatalogRequest(q),false,q);
});
test('live catalogue coalesces concurrent reads, refreshes uploads/updates/removals within TTL', async () => {
    let now=Date.now(),calls=0,documents=[entry()];
    const library=createAkdLibrary({env,clock:()=>now,ttlMs:30,fetcher:async()=>{calls++;return Response.json({success:true,documents})}});
    const results=await Promise.all(Array.from({length:50},()=>library.catalog()));assert.equal(calls,1);assert.ok(results.every(r=>r.documents.length===1));
    documents=[entry('next-akd','AKD baru.pdf')];now+=31;
    const refreshed=await library.catalog();assert.equal(calls,2);assert.deepEqual(refreshed.documents.map(d=>d.id),['next-akd']);
    documents=[];now+=31;assert.equal((await library.catalog()).documents.length,0);
});
test('catalogue errors/timeouts are unavailable, never an empty successful catalogue or secret leak', async () => {
    for(const fetcher of [async()=>Response.json({success:false,error:'test-only-secret'}),async()=>new Response('login'),
        async()=>new Response('x',{headers:{'content-length':String(3000000)}}),
        (_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('test-only-secret'))))]) {
        const result=await createAkdLibrary({env,fetcher,timeoutMs:10}).catalog();
        assert.equal(result.status,'unavailable');assert.ok(!JSON.stringify(result).includes('test-only-secret'));
    }
});
test('selection finds newly indexed topics but ignores old summaries and deleted IDs', () => {
    const d=entry();const index=[{...d,indexStatus:'ready',title:'Perbelanjaan',summary:'Penggunaan kenderaan jabatan.',topics:[],keywords:[]}];
    assert.equal(selectLiveAkd('AKD penggunaan kenderaan',[d],index)[0].id,d.id);
    assert.deepEqual(selectLiveAkd('AKD penggunaan kenderaan',[{...d,updatedAt:'2026-11-04'}],index),[]);
    assert.deepEqual(selectLiveAkd('AKD penggunaan kenderaan',[],index,[d.id]),[]);
    assert.equal(selectLiveAkd('terangkan AKD bil 5 2026',[d],[])[0].id,d.id);
    assert.deepEqual(selectLiveAkd('hai Sarah',[d],index),[]);
    assert.deepEqual(selectLiveAkd('jana kertas kerja penggunaan kenderaan',[d],index),[]);
});
test('live AKD list does not call model/RAG/17-source loader or show a deleted RAG entry',async()=>{
    const search=createUniversalSearch({akdCatalog:async()=>({status:'ready',documents:[entry()]}),
        catalog:()=>{throw new Error('Wrong loader')},retrieve:()=>{throw new Error('List must not read RAG')}});
    const result=await search({q:'senaraikan semua AKD'});
    assert.equal(result.total,1);assert.equal(result.results[0].id,'new-akd');assert.equal(result.sources.rag,'not-needed');
});
test('AKD content search excludes obsolete RAG text and keeps current catalogue metadata',async()=>{
    const d=entry();const passage={id:'akd:new-akd',title:d.name,type:'akd',url:d.url,updatedAt:'2020-01-01',text:'perbelanjaan lama',unit:'page',start:1,end:1};
    const search=createUniversalSearch({akdCatalog:async()=>({status:'ready',documents:[d]}),retrieve:async()=>({status:'ready',passages:[passage]})});
    const result=await search({q:'AKD perbelanjaan'});assert.equal(result.total,1);assert.equal(result.results[0].snippet,'');assert.equal(result.results[0].match,'Tajuk / metadata');
});
let serial=0;
async function setup(fetcher, task, {key=true}={}) {
    const names=['I4UMANAGE_GAS_URL','I4UMANAGE_DOC_SECRET','SARAH_RAG_INDEX_URL','SARAH_RAG_TOKEN','GEMINI_API_KEY'];
    const old=Object.fromEntries(names.map(n=>[n,process.env[n]])), oldFetch=globalThis.fetch;
    Object.assign(process.env,env,{I4UMANAGE_GAS_URL:`https://script.google.com/macros/s/live-${++serial}/exec`,SARAH_RAG_INDEX_URL:'https://script.google.com/macros/s/old-rag/exec',SARAH_RAG_TOKEN:'mock-rag-token'});
    if(key) process.env.GEMINI_API_KEY='mock-only';else delete process.env.GEMINI_API_KEY;
    globalThis.fetch=fetcher;
    try {await task();} finally {globalThis.fetch=oldFetch;for(const n of names) old[n]===undefined?delete process.env[n]:process.env[n]=old[n];}
}
test('main API serves listing with no Gemini key and no model/PDF/RAG request',async()=>{
    let calls=0;
    await setup(async(url,options)=>{calls++;assert.ok(!String(url).includes('old-rag'));assert.equal(JSON.parse(options.body).source,'akd');return Response.json({success:true,documents:[entry()]})},async()=>{
        const r=res();await handler(req('senaraikan semua AKD'),r);assert.equal(r.code,200);assert.equal(calls,1);assert.match(r.data.candidates[0].content.parts[0].text,/AKD BIL 5 2026/);
    },{key:false});
});
test('ready RAG cannot hide a new AKD: main API reads live PDF and returns its source',async()=>{
    let models=0,pdfs=0;
    await setup(async(url,options)=>{
        const u=String(url);assert.ok(!u.includes('old-rag'),'stale snapshot not used for explicit AKD');
        if(u.includes('script.google.com')) return Response.json({success:true,documents:[{...entry(),indexStatus:'ready',title:'Kawalan perbelanjaan',summary:'Kawalan perbelanjaan jabatan.',topics:[],keywords:[]}]});
        if(u.includes('drive.google.com')) {pdfs++;assert.ok(u.includes('id=new-akd'));return new Response('%PDF-1.7 fixture');}
        assert.ok(u.includes('generativelanguage.googleapis.com'));models++;
        const body=JSON.parse(options.body);assert.ok(body.contents.some(t=>t.parts.some(p=>p.inline_data?.mime_type==='application/pdf')));
        assert.ok(!JSON.stringify(body).includes('stale-snapshot-evidence'));
        return model('Dokumen kawalan perbelanjaan baharu telah dirujuk.');
    },async()=>{
        const r=res();await handler(req('terangkan AKD bil 5 2026 kawalan perbelanjaan'),r);
        assert.equal(r.code,200);assert.equal(pdfs,1);assert.equal(models,2);assert.equal(r.data.i4uVerification.sourceDocuments[0].id,'new-akd');
    });
});
test('selector uses live auto-index metadata even when RAG is configured, without another AI call',async()=>{
    await setup(async(url)=>{assert.ok(String(url).includes('script.google.com'));return Response.json({success:true,documents:[{...entry(),indexStatus:'ready',summary:'Penggunaan kenderaan jabatan.',topics:[],keywords:[]}]})},async()=>{
        const r=res();await selector({method:'POST',body:{query:'AKD penggunaan kenderaan jabatan'}},r);
        assert.equal(r.code,200);assert.equal(r.data.retrieval,'server-live-akd');assert.equal(r.data.documents[0].id,'new-akd');
    });
});
test('inaccessible PDF yields a useful explicit limitation, not an AI answer based on stale RAG',async()=>{
    await setup(async(url)=>{
        if(String(url).includes('script.google.com')) return Response.json({success:true,documents:[entry()]});
        assert.ok(String(url).includes('drive.google.com'));return new Response('<html>sign in</html>');
    },async()=>{
        const r=res();await handler(req('terangkan AKD bil 5 2026'),r);assert.equal(r.code,200);assert.equal(r.data.i4uAkd.retrieval,'content-unavailable');
    });
});
test('catalogue outage is typed and never falls back to an outdated AKD snapshot',async()=>{
    await setup(async(url)=>{assert.ok(!String(url).includes('old-rag'));return Response.json({success:false,error:'secret-upstream'})},async()=>{
        const r=res();await handler(req('terangkan AKD bil 5 2026'),r);assert.equal(r.code,503);assert.equal(r.data.error.code,'AKD_CATALOG_UNAVAILABLE');assert.ok(!JSON.stringify(r.data).includes('secret-upstream'));
    });
});
