import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { withSarahRequest, callGeminiReliably, requestFetch } from '../lib/sarah-resilience.js';
const req = () => ({method:'POST',body:{contents:[{role:'user',parts:[{text:'JDN'}]}]}});
function response() {
    const res = new EventEmitter();
    res.headers={};res.writes=0;
    res.setHeader=(key,value)=>{res.headers[key]=value;return res};
    res.status=code=>{res.code=code;return res};
    res.json=data=>{res.data=data;res.writes++;return res};
    return res;
}
const upstream=(status,data,headers={})=>({status,ok:status===200,headers:new Headers(headers),json:async()=>data});
const success={candidates:[{content:{parts:[{text:'Jawapan'}]}}]};
const modelHandler=async(_req,res)=>res.status(200).json((await callGeminiReliably('https://example.test/model',{})).data);
async function mockedFetch(fn,callback) {
    const original=globalThis.fetch;globalThis.fetch=fn;
    const log=console.error;console.error=()=>{};
    try{return await callback()}finally{globalThis.fetch=original;console.error=log}
}

test('429 honours Retry-After and recovers within one request',async()=>{
 let count=0;const start=Date.now();
 await mockedFetch(async()=>++count===1?upstream(429,{error:{message:'per-minute limit'}},{'Retry-After':'1'}):upstream(200,success),async()=>{
  const res=response();await withSarahRequest(req(),res,modelHandler);
  assert.equal(res.code,200);assert.equal(count,2);assert.ok(Date.now()-start>=1000);assert.equal(res.writes,1);
 });
});
test('transient 503 non-JSON and network failure both recover',async()=>{
 let count=0;
 await mockedFetch(async()=>{
  count++;if(count===1)return {status:503,ok:false,headers:new Headers(),json:async()=>{throw new SyntaxError('html')}};
  if(count===2)throw new TypeError('network');return upstream(200,success);
 },async()=>{const res=response();await withSarahRequest(req(),res,modelHandler);assert.equal(res.code,200);assert.equal(count,3)});
});
test('daily quota and bad credentials do not loop or leak upstream content',async()=>{
 for(const [status,message,code] of [[429,'daily quota exceeded','QUOTA'],[403,'secret-key-in-provider-error','CONFIGURATION']]) {
  let count=0;
  await mockedFetch(async()=>{count++;return upstream(status,{error:{message}})},async()=>{
   const res=response();await withSarahRequest(req(),res,modelHandler);
   assert.equal(count,1);assert.equal(res.data.error.code,code);assert.ok(!JSON.stringify(res.data).includes(message));
  });
 }
});
test('persistent provider failure is bounded to three attempts',async()=>{
 let count=0;
 await mockedFetch(async()=>{count++;return upstream(500,{error:{message:'temporary'}})},async()=>{
  const res=response();await withSarahRequest(req(),res,modelHandler);
  assert.equal(count,3);assert.equal(res.code,503);assert.equal(res.writes,1);
 });
});
test('verified first government answer avoids a redundant model generation',async()=>{
 const oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='mock-only';
 const {default:handler}=await import('../api/gemini.js');let calls=0;
 const data={candidates:[{finishReason:'STOP',content:{parts:[{text:'Rujuk maklumat JDN. [[I4U_STATUS:ACTIVE]]'}]},groundingMetadata:{
  webSearchQueries:['JDN rasmi'],groundingChunks:[{web:{uri:'https://www.jdn.gov.my/',title:'Jabatan Digital Negara'}}],
  groundingSupports:[{segment:{startIndex:0,endIndex:20,text:'Rujuk maklumat JDN.'},groundingChunkIndices:[0]}]
 }}]};
 try {await mockedFetch(async()=>{calls++;return upstream(200,structuredClone(data))},async()=>{
  const res=response();await handler(req(),res);assert.equal(res.code,200);assert.equal(calls,1);
  assert.equal(res.data.i4uVerification.mode,'government');assert.equal(res.writes,1);
 })} finally {if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey}
});
test('empty standard responses recover once; persistent empty and blocked responses are typed',async()=>{
 const oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='mock-only';
 const {default:handler}=await import('../api/gemini.js');
 const standardReq=()=>({method:'POST',body:{contents:[{role:'user',parts:[{text:'hai Sarah'}]}]}});
 const empty={candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{thought:true,text:'private reasoning'}]}}]};
 const blocked={promptFeedback:{blockReason:'SAFETY'}};
 const warning=console.warn;console.warn=()=>{};
 try {
  for(const [responses,status,code,expectedCalls] of [
   [[empty,success],200,null,2], [[empty,empty],502,'EMPTY_RESPONSE',2],
   [[{},{}],502,'EMPTY_RESPONSE',2], [[blocked],502,'RESPONSE_BLOCKED',1]
  ]) {
   let calls=0;
   await mockedFetch(async()=>upstream(200,structuredClone(responses[Math.min(calls++,responses.length-1)])),async()=>{
    const res=response();await handler(standardReq(),res);
    assert.equal(calls,expectedCalls);assert.equal(res.code,status);assert.equal(res.writes,1);
    if(code){assert.equal(res.data.error.code,code);assert.ok(res.data.error.requestId)}
    else assert.equal(res.data.candidates[0].content.parts[0].text,'Jawapan');
    assert.ok(!JSON.stringify(res.data).includes('private reasoning'));
   });
  }
 } finally { console.warn=warning;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey }
});
test('promotion question enables official search even when client flag is absent',async()=>{
 const oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='mock-only';
 const {default:handler}=await import('../api/gemini.js');let calls=0;
 const data={candidates:[{finishReason:'STOP',content:{parts:[{text:'Sila semak rujukan JPA. [[I4U_STATUS:ACTIVE]]'}]},groundingMetadata:{
  webSearchQueries:['TBK JPA'],groundingChunks:[{web:{uri:'https://docs.jpa.gov.my/',title:'Dokumen JPA'}}],
  groundingSupports:[{segment:{startIndex:0,endIndex:22,text:'Sila semak rujukan JPA.'},groundingChunkIndices:[0]}]
 }}]};
 try {await mockedFetch(async(_url,options)=>{
  calls++;const payload=JSON.parse(options.body);
  assert.ok(payload.tools.some(t=>t.google_search));assert.ok(JSON.stringify(payload.system_instruction).includes('docs.jpa.gov.my'));
  return upstream(200,structuredClone(data));
 },async()=>{
  const res=response();await handler({method:'POST',body:{contents:[{role:'user',parts:[{text:'apa dokumen yang perlu untuk naik pangkat time based berasas kecemerlangan untuk pembantu tadbir'}]}]}},res);
  assert.equal(res.code,200);assert.equal(res.data.i4uVerification.mode,'government');assert.equal(calls,1);
 })} finally {if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey}
});
test('long Retry-After exits without premature retries',async()=>{
 let count=0;
 await mockedFetch(async()=>{count++;return upstream(429,{error:{message:'minute quota'}},{'Retry-After':'120'})},async()=>{
  const res=response();await withSarahRequest(req(),res,modelHandler);
  assert.equal(count,1);assert.equal(res.code,503);assert.equal(res.headers['Retry-After'],'120');
 });
});
test('deadline aborts pending fetch, sends one response and releases capacity',async()=>{
 let aborted=false;
 await mockedFetch((_url,{signal})=>new Promise((_resolve,reject)=>{
  signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('aborted','AbortError'))},{once:true});
 }),async()=>{
  const res=response();await withSarahRequest(req(),res,async(_q,r)=>{
   await requestFetch('https://example.test/pending');return r.status(200).json({late:true});
  },{deadlineMs:25});
  assert.equal(res.code,504);assert.equal(res.data.error.code,'TIMEOUT');assert.equal(aborted,true);
  await new Promise(resolve=>setTimeout(resolve,5));assert.equal(res.writes,1);
  const next=response();await withSarahRequest(req(),next,async(_q,r)=>r.status(200).json({ok:true}));assert.equal(next.code,200);
 });
});
test('80-user burst caps active work at eight per instance with isolated request IDs',async()=>{
 let running=0,peak=0;let release;const gate=new Promise(resolve=>{release=resolve});
 const replies=Array.from({length:80},()=>response());
 const jobs=replies.map(res=>withSarahRequest(req(),res,async(_q,r)=>{
  running++;peak=Math.max(peak,running);await gate;running--;return r.status(200).json({ok:true});
 }));
 await new Promise(resolve=>setTimeout(resolve,0));release();await Promise.all(jobs);
 assert.equal(peak,8);assert.equal(replies.filter(r=>r.code===200).length,8);
 assert.equal(replies.filter(r=>r.code===503&&r.headers['Retry-After']==='3').length,72);
 assert.equal(new Set(replies.filter(r=>r.code===200).map(r=>r.headers['X-Request-ID'])).size,8);
 assert.ok(replies.every(r=>r.writes===1));
});
test('invalid or oversized payload rejected without invoking model',async()=>{
 let calls=0;const handler=()=>{calls++};
 for(const [body,expected] of [[{},400],[{contents:[{role:'user',parts:[{text:'x'.repeat(4300000)}]}]},413]]){
  const res=response();await withSarahRequest({...req(),body},res,handler);assert.equal(res.code,expected);
 }assert.equal(calls,0);
});
test('AKD sync shares concurrent work, caches success briefly, retries failed work',async()=>{
 const source=readFileSync(new URL('../api/akd-index.js',import.meta.url),'utf8');
 const block=source.slice(source.indexOf('let indexSyncInFlight'),source.indexOf('async function syncAkdIndex()'));
 let calls=0;let fail=true;
 const context=vm.createContext({Date,Promise,syncAkdIndex:async()=>{calls++;if(fail)throw new Error('busy');return {success:true}}});
 vm.runInContext(block+'\nglobalThis.sync = coalescedIndexSync;',context);
 await assert.rejects(context.sync());fail=false;
 const results=await Promise.all(Array.from({length:50},()=>context.sync()));
 assert.equal(calls,2);assert.ok(results.every(r=>r.success));await context.sync();assert.equal(calls,2);
});

function browserHarness({selectorError=false,networkError=false,responseData=null,renderError=false,rawText=null}={}) {
 const source=readFileSync(new URL('../js/scripts.js',import.meta.url),'utf8');
 const start=source.indexOf('const generateBotResponse =');
 const end=source.indexOf('// Logik teras hantar mesej',start);
 const timers=[];let calls=0;
 function element(){return {children:[],textContent:'',style:{removeProperty(){}},appendChild(child){this.children.push(child)},addEventListener(event,fn){this[event]=fn},classList:{add(){},remove(){}}}}
 const bubble=element();bubble.querySelector=()=>null;
 const text=element();bubble.querySelector=selector=>selector==='.message-text'?text:null;
 const history=[{role:'user',parts:[{text:'earlier'}]},{role:'model',parts:[{text:'answer'}]}];
 const input={disabled:true,focus(){},value:''};const button={disabled:true};
 const context=vm.createContext({
  console:{error(){}},AbortController,Blob,JSON,Error,Object,Number,Math,Boolean,Array,
  navigator:{onLine:true},document:{createElement:()=>element()},
  userData:{message:'pekeliling JDN',file:{data:null,mime_type:null}},chatHistory:history,
  messageInput:input,sendMessageButton:button,chatBody:{scrollTo(){},scrollHeight:0},
  detectRequestedFormats:()=>({}),getAkdSelectionForSarah:async()=>{if(selectorError)throw Error('selector failed');return {mode:false,selectedIds:[]}},
  extractDocumentBody:()=>null,getTextOutsideMarkers:text=>text,
  markdownToChatHtml:text=>text,linkSarahAkdReferences(){if(renderError)throw new Error('render failed')},
  addSarahCopyButton(){},addDownloadButtons(){},
  isGovernmentQuery:()=>true,isAkdQuery:()=>false,API_URL:'/api/gemini',
  setTimeout(fn,ms){timers.push({fn,ms});return timers.length},clearTimeout(){},setInterval(){return 1},clearInterval(){},
  fetch:async()=>{calls++;if(networkError)throw new TypeError('offline');if(responseData || rawText!==null)return {ok:true,status:200,headers:new Headers({'X-Request-ID':'success-ref'}),text:async()=>rawText ?? JSON.stringify(responseData)};return {ok:false,status:503,headers:new Headers(),text:async()=>JSON.stringify({error:{code:'BUSY',retryAfter:3,requestId:'test-ref'}})}}
 });
 vm.runInContext(source.slice(start,end)+'\nglobalThis.generate=generateBotResponse;',context);
 return {context,bubble,text,history,input,button,timers,calls:()=>calls};
}
test('client unlocks input on preparation failure and preserves prior history',async()=>{
 const h=browserHarness({selectorError:true});await h.context.generate(h.bubble);
 assert.equal(h.input.disabled,false);assert.equal(h.button.disabled,false);assert.equal(h.history.length,2);assert.equal(h.calls(),0);
 assert.ok(h.timers.some(t=>t.ms===90000));
});
test('client removes failed turn and retries same bubble without overlapping requests',async()=>{
 const h=browserHarness();await h.context.generate(h.bubble);
 assert.equal(h.history.length,2);assert.equal(h.calls(),1);
 const retry=h.text.children.find(e=>e.className?.includes('sarah-retry'));
 assert.ok(retry);assert.equal(retry.disabled,true);
 h.timers.find(t=>t.ms===3000).fn();assert.equal(retry.disabled,false);
 h.input.disabled=true;retry.click();assert.equal(h.calls(),1);
 h.input.disabled=false;retry.click();retry.click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(h.calls(),2);assert.equal(h.history.length,2);assert.equal(h.input.disabled,false);
});
test('browser transport failure restores controls and offers retry',async()=>{
 const h=browserHarness({networkError:true});await h.context.generate(h.bubble);
 assert.equal(h.history.length,2);assert.equal(h.input.disabled,false);
 assert.ok(h.text.children.some(e=>e.textContent==='Cuba semula'));
});


test('browser displays successful answer and preserves conversation',async()=>{
 const h=browserHarness({responseData:success});await h.context.generate(h.bubble);
 assert.equal(h.text.innerHTML,'Jawapan');assert.equal(h.history.length,4);
 assert.equal(h.history[3].role,'model');assert.equal(h.input.disabled,false);
 assert.ok(!h.text.children.some(e=>e.className?.includes('sarah-retry')));
});
test('browser distinguishes empty response from network failure and retains request ID',async()=>{
 const h=browserHarness({responseData:{candidates:[{content:{parts:[{thought:true,text:'private'}]}}]}});
 await h.context.generate(h.bubble);
 assert.ok(h.text.textContent.includes('AI tidak mengembalikan teks jawapan'));
 assert.ok(h.text.children.some(e=>e.textContent.includes('success-ref')));
 assert.equal(h.history.length,2);assert.equal(h.input.disabled,false);
 assert.ok(h.text.children.some(e=>e.className?.includes('sarah-retry')));
});
test('blocked answer offers rephrasing, not retrying the same blocked request',async()=>{
 const h=browserHarness({responseData:{promptFeedback:{blockReason:'SAFETY'}}});await h.context.generate(h.bubble);
 assert.ok(h.text.textContent.includes('nyatakan semula'));
 assert.ok(!h.text.children.some(e=>e.className?.includes('sarah-retry')));
 assert.equal(h.history.length,2);assert.equal(h.input.disabled,false);
});
test('source rendering failure keeps readable answer and exactly one model turn',async()=>{
 const h=browserHarness({responseData:success,renderError:true});await h.context.generate(h.bubble);
 assert.equal(h.text.textContent,'Jawapan');assert.equal(h.history.length,4);
 assert.equal(h.history[3].parts[0].text,'Jawapan');assert.equal(h.input.disabled,false);
});
test('non-JSON response retains server request reference',async()=>{
 const h=browserHarness({rawText:'<html>unavailable</html>'});await h.context.generate(h.bubble);
 assert.ok(h.text.children.some(e=>e.textContent.includes('success-ref')));
 assert.equal(h.history.length,2);assert.equal(h.input.disabled,false);
});
