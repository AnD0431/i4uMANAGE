import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../js/government-sources.js';
import '../js/universal-search-core.js';
import {createCatalogLoader, createUniversalSearch} from '../lib/sarah-universal-search.js';
import {createRagRetriever} from '../lib/sarah-rag.js';
import handler from '../api/universal-search.js';
const core = globalThis.SarahUniversalCore;
const doc = (id, title, type = 'slide-kursus', extra = {}) => ({id, title, type, url: `https://drive.google.com/file/d/${id}/view`, kind: 'document', origin: 'Test', year: '2025', category: 'latihan', ...extra});
const catalog = documents => async () => ({documents, status: 'ready', failed: 0});
const emptyRag = async () => ({status: 'disabled', passages: []});
const env = {I4UMANAGE_GAS_URL: 'https://script.google.com/macros/s/test/exec', I4UMANAGE_DOC_SECRET: 'test-secret'};
const json = value => new Response(JSON.stringify(value), {headers: {'Content-Type': 'application/json'}});

test('natural Malay and English search extracts type and year, including default all selector', () => {
    const ms = core.parse({q: 'tolong cari slaid latihan 2025', type: 'all'});
    assert.equal(ms.type, 'slide-kursus');assert.equal(ms.year, '2025');assert.deepEqual(ms.terms, ['latihan']);
    const en = core.parse({q: 'find working papers training 2025'});
    assert.equal(en.type, 'kertas-kerja');assert.deepEqual(en.terms, ['latihan']);
    assert.equal(core.parse({q: 'AKD', type: 'all'}).type, 'akd');
    assert.equal(core.parse({q: 'punca kuasa'}).type, 'punca-kuasa');
});
test('ranking prefers exact title and accepts one typo, excludes unrelated and inactive docs', () => {
    const documents = [doc('1', 'Latihan keselamatan'),doc('2', 'Latihan keselamtaan'),doc('3', 'Astronomi galaksi'),doc('4', 'Latihan keselamatan', 'akd', {status: 'replaced'})];
    const hits = core.rank(documents, core.parse({q: 'latihan keselamatan'})).results;
    assert.equal(hits[0].id, '1');assert.equal(hits[1].approximate, true);assert.equal(hits.length, 2);
    assert.equal(core.near('1234', '1235'), false);assert.equal(core.near('jpa', 'jpn'), false);
    assert.equal(core.rank(documents, core.parse({q: 'zzzxqwerty'})).results.length, 0);
});
test('synonyms, explicit filters and deduplication keep only matching documents', () => {
    const a = doc('1', 'Latihan kewangan'), b = doc('2', 'Latihan kewangan', 'kertas-kerja'), duplicate = {...a, id:'alias', url:'https://drive.google.com/open?id=1'};
    const q = core.parse({q:'finance training', type:'slide-kursus', category:'latihan', year:'2025'});
    assert.deepEqual(core.rank([a,b,duplicate],q).results.map(d=>d.id), ['1']);
    assert.equal(core.rank([a,b],{...q,year:'2024'}).results.length,0);
    assert.equal(core.safeUrl('javascript:alert(1)'), null);assert.equal(core.safeUrl('https://secret@example.com'),null);
});
test('source filters do not lose a matching type when a URL exists in multiple categories', () => {
    const a = doc('1','Cuti rehat','punca-kuasa'), b = {...a, type:'portal'};
    assert.equal(core.rank([b,a],core.parse({q:'cuti',type:'punca-kuasa'})).results[0].type,'punca-kuasa');
});
test('bad, oversized, empty and invalid filter requests are rejected', () => {
    for (const input of [{q:''},{q:'x'.repeat(301)},{q:'cuti',type:'invalid'},{q:'cuti',type:'constructor'},{q:'cuti',category:'toString'},{q:'cuti',year:'1999'},{q:'cuti',page:-1},{q:'cuti',category:'invalid'}]) assert.throws(()=>core.parse(input));
});
test('catalogue merges 17 sources, limits concurrency to four, shares concurrent refresh and caches', async () => {
    let calls=0,active=0,max=0;
    const loader = createCatalogLoader({env,fetcher:async (_, options)=>{
        calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;
        const job=JSON.parse(options.body);
        return json({success:true,documents:[{id:String(calls),name:'Latihan 2025',url:`https://example.gov.my/${job.type||'akd'}/${job.category||''}`} ]});
    }});
    const [a,b]=await Promise.all([loader(),loader()]);assert.equal(calls,17);assert.equal(max,4);assert.equal(a,b);assert.equal(a.documents.length,17);assert.equal(a.status,'ready');
    await loader();assert.equal(calls,17);
});
test('one failed source remains partial; timeout aborts and no secrets enter response', async () => {
    const loader=createCatalogLoader({env,timeoutMs:5,deadlineMs:20,fetcher:async(_,options)=>{
        const job=JSON.parse(options.body);
        if(job.source==='akd') return json({success:true,documents:[{id:'1',name:'AKD',url:'https://example.gov.my/a'}]});
        return new Promise((_,reject)=>{options.signal.addEventListener('abort',()=>reject(new Error('test-secret')),{once:true});});
    }});
    const result=await loader();assert.equal(result.status,'partial');assert.ok(result.failed>0);assert.ok(!JSON.stringify(result).includes('test-secret'));
});
test('disabled and completely failed catalogues are distinct from successful empty lists', async () => {
    assert.equal((await createCatalogLoader({env:{}})()).status,'disabled');
    assert.equal((await createCatalogLoader({env,fetcher:async()=>json({success:true,documents:[]})})()).status,'ready');
    assert.equal((await createCatalogLoader({env,fetcher:async()=>json({success:false})})()).status,'unavailable');
});
test('federation retains portal results and reports unavailable document sources', async () => {
    const search=createUniversalSearch({catalog:async()=>{throw new Error('secret');},retrieve:emptyRag});
    const result=await search({q:'portal JDN'});assert.ok(result.results.some(r=>/digital negara/i.test(r.title)));
    assert.equal(result.sources.catalog,'unavailable');assert.equal(result.sources.rag,'disabled');assert.ok(!JSON.stringify(result).includes('secret'));
});
test('body matches contain real excerpts and page locations; content beats duplicate metadata', async () => {
    const d=doc('x','Panduan dalaman','akd');
    const search=createUniversalSearch({catalog:catalog([d]),retrieve:async()=>({status:'ready',generatedAt:'2026-10-20',passages:[{...d,text:'Permohonan cuti rehat direkodkan oleh pegawai.',unit:'page',start:4,end:4,origin:'Indeks kandungan RAG'}]})});
    const result=await search({q:'cuti rehat'});assert.equal(result.results.length,1);assert.match(result.results[0].snippet,/Permohonan cuti/);assert.equal(result.results[0].location,'Halaman 4');assert.equal(result.results[0].match,'Petikan kandungan');
});
test('RAG custom search receives validated public index, and cached retrieval stays compatible', async () => {
    let calls=0;
    const retrieve=createRagRetriever({env:{SARAH_RAG_INDEX_URL:env.I4UMANAGE_GAS_URL,SARAH_RAG_TOKEN:'token'},fetcher:async()=>{calls++;return json({version:1,generatedAt:new Date().toISOString(),documents:[]});},searcher:(index,q)=>[{title:q,count:index.documents.length}]});
    const result=await retrieve('cuti');assert.equal(result.passages[0].title,'cuti');await retrieve('aset');assert.equal(calls,1);
});
test('pagination keeps stable results without leaking full body/index/credentials', async () => {
    const search=createUniversalSearch({catalog:catalog(Array.from({length:29},(_,i)=>doc(String(i),`Latihan ${String(i).padStart(2,'0')}`))),retrieve:emptyRag});
    const a=await search({q:'latihan',type:'slide-kursus'}),b=await search({q:'latihan',type:'slide-kursus',page:1});
    assert.equal(a.total,29);assert.equal(a.results.length,12);assert.ok(a.hasMore);assert.equal(new Set([...a.results,...b.results].map(r=>r.id)).size,24);
    assert.ok(!JSON.stringify(a).includes('titleWords'));assert.ok(!JSON.stringify(a).includes('bodyWords'));
});
test('API validation rejects incorrect methods and invalid inputs before source requests', async () => {
    const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
    await handler({method:'GET'},res);assert.equal(res.code,405);
    await handler({method:'POST',body:{q:'x'.repeat(400)},headers:{}},res);assert.equal(res.code,400);
});
test('all six pages load shared search scripts before chat and expose one action', () => {
    for (const file of ['index','akd','puncakuasa','slaid','kerja','document']) {
        const html=readFileSync(new URL(`../${file}.html`,import.meta.url),'utf8');
        assert.ok(html.includes('css/universal-search.css'));assert.ok(html.indexOf('js/universal-search.js')<html.indexOf('js/scripts.js'));
    }
    const js=readFileSync(new URL('../js/scripts.js',import.meta.url),'utf8');assert.match(js,/label: "Universal Smart Search"/);assert.match(js,/SarahUniversalCore\?\.isIntent/);
});
test('real RAG search supports title-only discovery, body excerpts, type filters and hidden archived records', async () => {
    const oldFetch=globalThis.fetch, oldUrl=process.env.SARAH_RAG_INDEX_URL,oldToken=process.env.SARAH_RAG_TOKEN;
    process.env.SARAH_RAG_INDEX_URL=env.I4UMANAGE_GAS_URL;process.env.SARAH_RAG_TOKEN='fixture-token';
    const entry=(id,type,title,text,status='reference')=>({id,type,title,url:`https://example.gov.my/${id}.pdf`,audience:'public',status,revision:'a'.repeat(64),chunks:[{id:'p1',text,unit:'page',start:2,end:2}]});
    globalThis.fetch=async()=>json({version:1,generatedAt:new Date().toISOString(),documents:[entry('a','akd','Panduan Inventori','Rekod aset disimpan oleh pegawai.'),entry('b','punca-kuasa','Pekeliling lama','Rekod aset lama.', 'archived')]});
    try {
        const search=createUniversalSearch({catalog:catalog([])});
        const title=await search({q:'inventori'});assert.equal(title.results[0].title,'Panduan Inventori');
        const body=await search({q:'rekod aset',type:'akd'});assert.equal(body.results.length,1);assert.equal(body.results[0].location,'Halaman 2');
        assert.equal((await search({q:'rekod aset',type:'slide-kursus'})).results.length,0);
    } finally {globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SARAH_RAG_INDEX_URL;else process.env.SARAH_RAG_INDEX_URL=oldUrl;if(oldToken===undefined)delete process.env.SARAH_RAG_TOKEN;else process.env.SARAH_RAG_TOKEN=oldToken;}
});
