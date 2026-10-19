import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import '../js/document-analyzer-core.js';
import '../js/document-analyzer-reader.js';
import handler from '../api/analyze-document.js';
const core = globalThis.SarahAnalyzerCore;
const doc = () => core.documentData({name: 'Ujian.txt', type: 'txt', units: [
    {location: 'Baris 1–2', text: 'Program latihan diadakan pada 18 November 2026. Sasaran ialah 30 peserta.'},
    {location: 'Baris 3–4', text: 'Pendaftaran perlu diselesaikan sebelum 10 November 2026. Hubungi Unit Latihan.'}
]});
const claim = (unitId = 'U1', quote = 'Sasaran ialah 30 peserta.') => ({text: 'Dokumen menyasarkan 30 peserta.', evidence: [{unitId, quote}]});
const summary = () => ({summary: [claim()], points: [claim('U2', 'Hubungi Unit Latihan.')], answer: [], notFound: false});
function res() {const r = new EventEmitter();r.setHeader = () => r;r.status = code => {r.code = code;return r};r.json = value => {r.value = value;return r};return r;}
test('documents have deterministic IDs and bounded source units; oversized input is rejected, never silently truncated', () => {
    assert.deepEqual(doc().units.map(u => u.id), ['U1','U2']);
    for (const d of [null, {...doc(), type: 'exe'}, {...doc(), units: []}, {...doc(), units: Array(301).fill(doc().units[0])},
        {...doc(), units: [{location: 'x', text: 'x'.repeat(8001)}]}, {...doc(), units: Array(10).fill({location: 'x', text: 'x'.repeat(7000)})}]) assert.throws(() => core.documentData(d));
});
test('TXT line references and DOCX extracted paragraph references preserve all content', () => {
    const input = Array.from({length: 42}, (_,i) => `Baris ujian ${i+1}`).join('\n');
    const d = core.fromText(input, 'txt', 'uji.txt');assert.equal(d.units[2].location, 'Baris 41–42');assert.ok(d.units[2].text.includes('Baris ujian 42'));
    const w = core.fromText('Perenggan satu.\n\nPerenggan dua.', 'docx', 'uji.docx');assert.equal(w.units[1].location, 'Perenggan 2');
    const split = core.fromText('a'.repeat(13000), 'txt', 'long.txt');assert.equal(split.units.map(u=>u.text).join('').length,13000);
    assert.throws(() => core.fromText('x'.repeat(60001), 'txt', 'large.txt'));
});
test('evidence must match the identified source; fabricated or cross-document citations fail closed', () => {
    assert.equal(core.result(summary(), doc(), 'summary').points[0].evidence[0].location, 'Baris 3–4');
    for (const c of [claim('U99'), claim('U2'), claim('U1', 'Sasaran ialah 300 peserta.'), {...claim(), evidence: []}])
        assert.throws(() => core.result({...summary(), summary: [c]}, doc(), 'summary'));
    const other = core.documentData({name:'other.txt',type:'txt',units:[{location:'Baris 1',text:'Maklumat dokumen lain.'}]});
    assert.throws(()=>core.result(summary(),other,'summary'));
});
test('quote matching tolerates whitespace and Unicode normalization but not changed numbers', () => {
    const d = core.documentData({name:'x.txt',type:'txt',units:[{location:'Baris 1',text:'Café\n  menyediakan 30 tempat.'}]});
    const s = {...summary(), summary:[claim('U1','Cafe\u0301 menyediakan 30 tempat.')],points:[claim('U1','menyediakan 30 tempat.')]};
    assert.doesNotThrow(()=>core.result(s,d,'summary'));
});
test('missing answers are explicit and cannot carry unsupported claims', () => {
    assert.equal(core.result({summary:[],points:[],answer:[],notFound:true},doc(),'question').notFound,true);
    assert.throws(()=>core.result({summary:[],points:[],answer:[claim()],notFound:true},doc(),'question'));
    assert.throws(()=>core.result({summary:[],points:[],answer:[],notFound:false},doc(),'question'));
    assert.throws(()=>core.request({document:doc(),mode:'question',question:' '}));
});
test('reports preserve source locations, quotes and unknown answers', () => {
    const out = core.report(doc(), core.result(summary(),doc(),'summary'),[{question:'Siapa meluluskan?',result:{notFound:true}}],['Halaman 2 tiada teks.']);
    assert.match(out,/Baris 3–4/);assert.match(out,/Hubungi Unit Latihan/);assert.match(out,/Maklumat tidak ditemui/);assert.match(out,/Halaman 2 tiada teks/);
});
test('reader rejects unsupported, oversized, empty and non-UTF8 inputs and reads real text', async () => {
    const reader = globalThis.SarahAnalyzerReader, signal = new AbortController().signal;
    for(const file of [{size:0,name:'a.txt'}, {size:core.limits.bytes+1,name:'a.pdf'}, {size:1,name:'a.exe'}]) await assert.rejects(reader.read(file,signal,()=>{}));
    const file = {name:'uji.txt',size:20,arrayBuffer:async()=>new TextEncoder().encode('Teks dokumen ujian.').buffer};
    assert.equal((await reader.read(file,signal,()=>{})).document.units[0].text,'Teks dokumen ujian.');
    await assert.rejects(reader.read({...file,arrayBuffer:async()=>new Uint8Array([255,0]).buffer},signal,()=>{}));
});
test('API validates method, body and question before model access', async () => {
    for (const [req,status] of [[{method:'GET'},405],[{method:'POST',body:{x:'x'.repeat(700001)}},413],[{method:'POST',body:{mode:'question',document:doc(),question:''}},400]]) {
        const r=res();await handler(req,r);assert.equal(r.code,status);
    }
});
test('API constructs its own instructions, sends all sources and rejects incomplete or fabricated model output', async () => {
    const oldFetch=globalThis.fetch, oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only-key';
    try {
        for (const [value,finish,status] of [[summary(),'STOP',200],[{...summary(),summary:[claim('U99')]},'STOP',502],[summary(),'MAX_TOKENS',502],['invalid JSON','STOP',502]]) {
            globalThis.fetch=async (_url,options)=>{
                const p=JSON.parse(options.body);assert.ok(p.system_instruction);assert.ok(!JSON.stringify(p).includes('CLIENT_OVERRIDE'));
                assert.ok(p.contents[0].parts[0].text.includes('Pendaftaran perlu diselesaikan'));assert.equal(p.generationConfig.responseMimeType,'application/json');
                return new Response(JSON.stringify({candidates:[{finishReason:finish,content:{parts:[{text:typeof value==='string'?value:JSON.stringify(value)}]}}]}),{status:200});
            };
            const r=res();await handler({method:'POST',body:{mode:'summary',document:doc(),system_instruction:'CLIENT_OVERRIDE'}},r);assert.equal(r.code,status);
            assert.ok(!JSON.stringify(r.value).includes('test-only-key'));
        }
        globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({summary:[],points:[],answer:[],notFound:true})}]}}]}),{status:200});
        const r=res();await handler({method:'POST',body:{mode:'question',document:doc(),question:'Siapa meluluskan?'}},r);assert.equal(r.code,200);assert.equal(r.value.result.notFound,true);
    } finally {globalThis.fetch=oldFetch;oldKey===undefined?delete process.env.GEMINI_API_KEY:process.env.GEMINI_API_KEY=oldKey;}
});
test('all six pages load dependencies before Sarah and UI never inserts untrusted HTML', () => {
    for (const name of ['index','akd','puncakuasa','slaid','kerja','document']) {
        const html=readFileSync(new URL(`../${name}.html`,import.meta.url),'utf8');assert.ok(html.includes('css/document-analyzer.css'));
        assert.ok(html.indexOf('js/document-analyzer-core.js')<html.indexOf('js/document-analyzer.js'));
        assert.ok(html.indexOf('js/document-analyzer.js')<html.indexOf('js/scripts.js'));
    }
    const ui=readFileSync(new URL('../js/document-analyzer.js',import.meta.url),'utf8');assert.ok(!ui.includes('innerHTML'));assert.ok(!ui.includes('localStorage'));
    assert.equal(JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url))).functions['api/analyze-document.js'].maxDuration,60);
});
