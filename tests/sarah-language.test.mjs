import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import '../js/government-sources.js';
const language=globalThis.SarahGovernmentSources;
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const text=language.normalizeForRouting;
const utterances=[
 ['Terengganu','mung nok tahu pekliling cuti nape',['jpa','jpa-docs']],
 ['Kelantan','kawe nok mohon cuty, guano syarat dio',['jpa']],
 ['Utara','hang tau dak pekelilng cuti rehat ni',['jpa','jpa-docs']],
 ['Perak','teman nak semak tuntutna perjalanam',['treasury']],
 ['Negeri Sembilan','den nak tanyo kenaikna pngkat',['jpa']],
 ['Sabah','sia mau tau pasal cuti bersalin bah',['jpa']],
 ['Sarawak','kamek mok cari pekliling perkhidmatna tok',['jpa-docs']],
 ['Bahasa rojak','sy nk check annual leave utk civil service',['jpa']],
 ['Mandarin','公务员怎么申请年假？',['jpa']],
 ['Tamil','அரசு ஊழியர் விடுப்பு எப்படி விண்ணப்பிப்பது?',['jpa']],
 ['Singkatan','sy nk naik pngkat time based',['jpa','jpa-docs']],
 ['Huruf berulang','pekkkeliling cutiii penjawat awam',['jpa']]
];
for(const [label,message,sources] of utterances) test(label+' routes to appropriate official sources',()=>{
 assert.ok(language.isGovernmentQuery(message),text(message));
 const ids=language.findSources(message).map(s=>s.id);
 for(const id of sources)assert.ok(ids.includes(id),message+' -> '+id+' actual: '+ids);
});
test('conservative spelling supports deletion, insertion and transposition',()=>{
 for(const [input,expected] of [['pekelilng','pekeliling'],['pekkeliling','pekeliling'],['pekkkeliling','pekeliling'],['pekeliilng','pekeliling'],['perkhidmatna','perkhidmatan'],['dokumn','dokumen'],['pendidikna','pendidikan']])assert.equal(text(input),expected);
});
test('does not guess ambiguous dialect words or short agency acronyms',()=>{
 assert.equal(text('dok demo hang bah kamek x tak bukan jangan'), 'dok demo hang bah kamek x tak bukan jangan');
 assert.equal(text('halaman angkat tarikan'), 'halaman angkat tarikan');
 assert.equal(text('JPA JPN JDN KKM MOH SPA AKD'), 'jpa jpn jdn kkm moh spa akd');
 assert.ok(!language.isGovernmentQuery('mohon bantuan siapa awak spaghetti emotional'));
});
test('preserves negation, grades, dates, amounts, identifiers and quoted names in routing',()=>{
 const input='jangan ubah bukan 15/2026 RM1,234.50 N19 SR.5.1.1 AKD-2026 "Pekelilng" https://example.test/pekelilng?id=12 pekelilng@example.test';
 assert.equal(text(input),input.toLowerCase());
 assert.equal(text('===TAMAT_DOKUMEN==='),'===tamat_dokumen===');
});
test('long pasted input has bounded routing work',()=>{assert.ok(text('dokumen '.repeat(10000)).length<=12000)});
function block(source,name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);return source.slice(start,source.indexOf('\n}',start)+2)}
const client=read('js/scripts.js');const ctx=vm.createContext({SarahGovernmentSources:language});
for(const name of ['normalizeSarahQuery','isAkdQuery','isDocumentSearchIntent','parseDocumentSearchRequest'])vm.runInContext(block(client,name),ctx);
test('frontend recognises AKD and document search with typos',()=>{
 assert.ok(ctx.isDocumentSearchIntent('tlg carik dokumn latihna 2026'));
 assert.ok(ctx.isAkdQuery('arahan kawalna dalamna'));
 const result=ctx.parseDocumentSearchRequest('tlg carik dokumn latihna 2026');
 assert.equal(result.year,2026);assert.equal(result.category,'latihan');
});
const server=read('api/gemini.js');const helpers=vm.createContext({SarahGovernmentSources:language});
vm.runInContext(server.replace(/^import .*;\r?\n/gm,'').replace('export default function handler','function handler'),helpers);
test('server typo routing preserves completed document markers',()=>{
 assert.ok(helpers.isAkdQuery('arahan kawalna dalamna'));
 assert.ok(helpers.isKertasKerjaAnalysisRequest('semak kertas keje'));
 assert.equal(helpers.detectGovernmentTopic('naik pngkat'),'public-service');
 const history=[{role:'user',parts:[{text:'buat kertas keje utk kursus'}]}];
 assert.ok(helpers.isKertasKerjaConversation(history));
 history.push({role:'model',parts:[{text:'===MULA_DOKUMEN==='+'Isi '.repeat(4000)+'===TAMAT_DOKUMEN==='}]});
 assert.equal(helpers.isKertasKerjaConversation(history),false);
});
test('main endpoint preserves original text and adds language instructions without extra AI calls',async()=>{
 const {default:handler}=await import('../api/gemini.js');
 const oldKey=process.env.GEMINI_API_KEY,oldFetch=globalThis.fetch;
 process.env.GEMINI_API_KEY='mock-only';let calls=0;
 const original='hai sarah, mung boleh jawab dlm English?';
 const body={contents:[{role:'user',parts:[{text:original}]}]},snapshot=JSON.stringify(body);
 globalThis.fetch=async(_url,options)=>{
  calls++;const payload=JSON.parse(options.body);
  assert.equal(payload.contents[0].parts[0].text,original);
  assert.ok(payload.system_instruction.parts.some(p=>p.text.includes('PEMAHAMAN BAHASA')));
  assert.ok(JSON.stringify(payload.system_instruction).includes('penafian'));
  return {ok:true,status:200,headers:new Headers(),json:async()=>({candidates:[{content:{parts:[{text:'Yes, I can help with official work.'}]}}]})};
 };
 try{
  const res={setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};
  await handler({method:'POST',body},res);
  assert.equal(res.code,200);assert.equal(calls,1);assert.equal(JSON.stringify(body),snapshot);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey}
});
test('AKD selector keeps original question and JSON contract with dialect guidance',async()=>{
 const selector=read('api/akd-selector.js');let payload;
 const context=vm.createContext({GEMINI_API_KEY:'mock',MODEL:'mock',SarahGovernmentSources:language,buildCatalog:docs=>docs,extractJson:JSON.parse,
  fetch:async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"selectedIds":["doc-1"],"reason":"relevan"}'}]}}]})}}
 });
 const start=selector.indexOf('async function selectDocumentsWithAi('),end=selector.indexOf('function resolveSelectedDocuments(',start);
 vm.runInContext(selector.slice(start,end),context);
 const original='kamek mok semak pekliling tok';
 const result=await context.selectDocumentsWithAi(original,[{id:'doc-1',title:'Pekeliling'}]);
 assert.ok(payload.system_instruction.parts[0].text.includes('selectedIds kosong'));
 assert.ok(payload.contents[0].parts[0].text.includes(original));
 assert.equal(payload.generationConfig.responseMimeType,'application/json');
 assert.equal(result.selectedIds[0],'doc-1');
});
