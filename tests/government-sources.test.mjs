import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=process.argv[2] || path.resolve(dir,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const resilience = await import(path.join(root, 'lib/sarah-resilience.js'));
const ctx=vm.createContext({...resilience, URL,console,process,setTimeout,clearTimeout,AbortController,Intl});
vm.runInContext(read('js/government-sources.js'),ctx);
const catalog=ctx.SarahGovernmentSources;
let checks=0;
function ok(v,label){assert.ok(v,label);checks++;}
const ids=q=>Array.from(catalog.findSources(q),s=>s.id);
ok(catalog.sources.filter(s=>s.category==='ministry').length===27,'27 ministries');
ok(catalog.sources.filter(s=>s.category==='state-education').length===16,'16 education departments');
for(const s of catalog.sources){
 ok(catalog.isGovernmentQuery(s.name),s.name+' triggers government');
 ok(ids(s.name).includes(s.id),s.name+' routes to its source');
 const url=new URL(s.url);ok(url.hostname.endsWith('.gov.my'),s.id+' official domain');
 for(const keyword of s.keywords){
  ok(catalog.isGovernmentQuery(keyword.toUpperCase()),s.id+': '+keyword);
 }
}
for(const [query,expected] of [
 ['apa dokumen yang perlu untuk naik pangkat time based berasas kecemerlangan untuk pembantu tadbir',['jpa','jpa-docs']],
 ['TBK1 dan TBK2',['jpa','jpa-docs']], ['TBBK',['jpa','jpa-docs']], ['time-based',['jpa','jpa-docs']],
 ['Garis Panduan Kelulusan Projek ICT JDN',['jdn','jdn-policy']],
 ['technical & costing',['jdn']],['MyGovUC',['jdn']],
 ['perolehan ICT KKM',['treasury','jdn','moh']],
 ['cuti guru JPN Terengganu',['jpa','jpa-docs','moe','education-jpnterengganu']],
 ['JPN   PULAU-PINANG',['education-jpnpp']],
 ['eGTukar Selangor',['moe','education-jpnselangor']],
 ['JPN MyKad Terengganu',['jpn-registration']],
 ['Kementerian Sumber Manusia',['kesuma']],['Ministry of Higher Education',['mohe']],
 ['Kementerian Pendidikan Tinggi',['mohe']],['MINDEF',['mod']],
 ['PETRA dan NRES',['petra','nres']],['MITI',['miti']]]) {
 const actual=ids(query);for(const id of expected)ok(actual.includes(id),query+' -> '+id);
}
ok(!ids('Kementerian Pendidikan Tinggi').includes('moe'),'KPT not mistaken for KPM');
ok(!ids('MyKad JPN Terengganu').some(id=>id.startsWith('education-')),'MyKad is not JPN education');
ok(!ids('Saya dari Selangor').some(id=>id.startsWith('education-')),'state alone is not education');
ok(ids('senarai semua kementerian').filter(id=>catalog.sources.find(s=>s.id===id).category==='ministry').length===27,'list routes all 27');
ok(ids('senarai semua JPN pendidikan').filter(id=>catalog.sources.find(s=>s.id===id).category==='state-education').length===16,'list routes all 16');
for(const q of ['',null,'siapa awak','mohon bantuan','spaghetti','emotional','tomorrow','hai Sarah']){
 ok(!catalog.isGovernmentQuery(q),'no acronym substring match: '+q);
}
ok(catalog.getSearchInstruction('JPN').includes('tanya sama ada'),'ambiguous JPN clarification');
// Execute real backend helpers and frontend wrapper with the same classic-script catalog.
const server=read('api/gemini.js');
vm.runInContext(server.replace(/^import \{[^\n]+sarah-resilience.js\";\r?\n/m,'').replace(/^import "\.\.\/js\/government-sources.js";\r?\n/m,'').replace(/^import \{[^\n]+sarah-rag.js\";\r?\n/m,'').replace('export default function handler','function handler'),ctx);
const helpers=vm.runInContext('({isGovernmentQuery, getGovernmentTopicInstruction, isAuthoritativeGovernmentHostname, detectGovernmentTopic})',ctx);
for(const q of ['JDN','JPN Kedah','MITI','MOHE','mohon bantuan']){
 ok(helpers.isGovernmentQuery(q)===catalog.isGovernmentQuery(q),'server shares matcher: '+q);
}
ok(helpers.detectGovernmentTopic('naik pangkat time based pembantu tadbir')==='public-service','promotion routes to public service');
const combined=helpers.getGovernmentTopicInstruction('finance','perolehan ICT JDN');
ok(combined.includes('ppp.treasury.gov.my')&&combined.includes('https://www.jdn.gov.my/'),'finance retains MOF and adds JDN');
for(const bad of ['moh.gov.my.example.com','evilgov.my','gov.my.attacker.test','example.com']){
 ok(!helpers.isAuthoritativeGovernmentHostname(bad,'general-government'),'reject spoof domain '+bad);
}
for(const good of ['jdn.gov.my','jpnterengganu.moe.gov.my','digital.gov.my']){
 ok(helpers.isAuthoritativeGovernmentHostname(good,'general-government'),'accept '+good);
}
const client=read('js/scripts.js');
const wrapper=client.match(/function isGovernmentQuery\(message\) \{[^]*?\n\}/)[0];
vm.runInContext(wrapper,ctx);
for(const q of ['JDN','JPN Kedah','MITI','MOHE','mohon bantuan']){
 ok(vm.runInContext(`isGovernmentQuery(${JSON.stringify(q)})`,ctx)===catalog.isGovernmentQuery(q),'client shares matcher: '+q);
}
ok(/government_mode:\s*isGovernmentQuery\(sentMessage\)/.test(client),'request flag connected');
for(const page of ['index','puncakuasa','slaid','kerja','document','akd']){
 const html=read(page+'.html');
 const catalogScript=html.indexOf('src="js/government-sources.js"');
 ok(catalogScript>=0 && catalogScript<html.indexOf('src="js/scripts.js"'),page+' load order');
}
// Real endpoint transport with a mocked model response: no network / paid API calls.
process.env.GEMINI_API_KEY='mock-test-only';
const {default: handler}=await import(path.join(root,'api/gemini.js'));
let payloads=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 assert.ok(String(url).startsWith('https://generativelanguage.googleapis.com/'),'unexpected external call');
 payloads.push(JSON.parse(options.body));
 return {ok:false,status:403,json:async()=>({error:{message:'Mock invalid credentials'}})};
};
const savedError=console.error;console.error=()=>{};
try{
 for(const [message,expectedDomain] of [['naik pangkat time based pembantu tadbir','docs.jpa.gov.my'],['JDN','jdn.gov.my'],['JPN Terengganu','jpnterengganu.moe.gov.my'],['MITI','miti.gov.my']]){
  payloads=[];
  const res={status(code){this.code=code;return this},json(data){this.data=data;return this}};
  await handler({method:'POST',body:{government_mode:false,contents:[{role:'user',parts:[{text:message}]}]}},res);
  ok(payloads.length>0,message+' reaches model');
  ok(payloads[0].tools.some(t=>t.google_search),message+' enables Google Search server side');
  ok(payloads[0].system_instruction.parts.some(p=>p.text.includes(expectedDomain)),message+' sends agency source');
 }
}finally{globalThis.fetch=originalFetch;console.error=savedError;delete process.env.GEMINI_API_KEY;}
console.log(`PASS: ${checks} assertions; shared browser/server detection, routing, source boundaries, six pages, mocked endpoint.`);
