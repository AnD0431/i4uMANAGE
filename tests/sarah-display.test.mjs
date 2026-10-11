import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/scripts.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('// Progressive display uses'),source.indexOf('// API setup'));
function target(){const listeners=new Map();return {listeners,addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn)},removeEventListener(name,fn){listeners.get(name)?.delete(fn)},fire(name,event={}){for(const fn of listeners.get(name)||[])fn(event)}}}
function harness({reduced=false,hidden=false}={}){
 const body=Object.assign(target(),{style:{},scrollTop:120,clientTop:1,getBoundingClientRect:()=>({top:100}),scrollTo(value){this.scrollTop=value.top;this.scrolls.push(value)},scrolls:[]});
 const button=target(),timers=[],updates=[];
 const nodes=[['Salam, ini jawapan Sarah. ',false],['Pautan rasmi',false],['Disahkan',true]].map(([data,excluded])=>({data,parentElement:{closest:()=>excluded?{}:null},appendData(chunk){this.data+=chunk;updates.push(chunk)}}));
 const attrs=new Map();const element={style:{minHeight:''},getAttribute:key=>attrs.get(key)??null,setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key),getBoundingClientRect:()=>({height:500}),isConnected:true};
 const message={classList:{remove(){}},getBoundingClientRect:()=>({top:300})};
 const doc={hidden,createTreeWalker(){let index=0;return {nextNode:()=>nodes[index++]||null}}};
 const context=vm.createContext({chatBody:body,scrollToBottomButton:button,document:doc,NodeFilter:{SHOW_TEXT:4},Intl,parseFloat,
  window:{matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({boxSizing:'border-box'})},updateScrollToBottomButton(){},setTimeout(fn){timers.push(fn)}});
 vm.runInContext(helpers,context);
 return {context,body,button,nodes,element,message,doc,timers,updates,attrs};
}
async function flush(h){while(h.timers.length){h.timers.shift()();await Promise.resolve();await Promise.resolve()}}
test('answer appears one word at a time without replacing HTML, links or verification labels',async()=>{
 const h=harness(),reading=h.context.trackSarahReading();
 const promise=h.context.revealSarahAnswer(h.element,h.message,reading);
 assert.equal(h.nodes[0].data,'Salam, ');assert.equal(h.nodes[1].data,'');assert.equal(h.nodes[2].data,'Disahkan');
 assert.equal(h.attrs.get('aria-busy'),'true');assert.equal(h.element.style.minHeight,'500px');
 assert.equal(h.body.scrolls.length,1);assert.equal(h.body.scrolls[0].top,307);
 h.timers.shift()();await Promise.resolve();assert.equal(h.nodes[0].data,'Salam, ini ');
 await flush(h);await promise;reading.dispose();
 assert.equal(h.nodes[0].data,'Salam, ini jawapan Sarah. ');assert.equal(h.nodes[1].data,'Pautan rasmi');
 assert.equal(h.element.style.minHeight,'');assert.equal(h.attrs.has('aria-busy'),false);
 assert.equal(h.body.scrolls.length,1);
 assert.ok([...h.body.listeners.values()].every(set=>set.size===0));
});
test('scrolling while waiting prevents automatic repositioning when answer arrives',async()=>{
 const h=harness(),reading=h.context.trackSarahReading();h.body.fire('wheel');h.body.scrollTop=40;
 const promise=h.context.revealSarahAnswer(h.element,h.message,reading);await flush(h);await promise;
 reading.showStart(h.message);reading.dispose();assert.equal(h.body.scrollTop,40);assert.equal(h.body.scrolls.length,0);
});
test('manual scroll during word reveal stays at the readers chosen position',async()=>{
 const h=harness(),reading=h.context.trackSarahReading();const promise=h.context.revealSarahAnswer(h.element,h.message,reading);
 h.body.fire('touchstart');h.body.scrollTop=72;await flush(h);await promise;reading.showStart(h.message);reading.dispose();
 assert.equal(h.body.scrollTop,72);assert.equal(h.body.scrolls.length,1);
});
test('reduced motion displays complete answer without timers',async()=>{
 const h=harness({reduced:true}),reading=h.context.trackSarahReading();await h.context.revealSarahAnswer(h.element,h.message,reading);reading.dispose();
 assert.equal(h.nodes[0].data,'Salam, ini jawapan Sarah. ');assert.equal(h.timers.length,0);assert.equal(h.body.scrolls.length,1);
});
test('hidden tab or detached reply completes text and cleans up instead of leaving partial answer',async()=>{
 for(const mode of ['hidden','detached']){
  const h=harness(),reading=h.context.trackSarahReading();const promise=h.context.revealSarahAnswer(h.element,h.message,reading);
  if(mode==='hidden')h.doc.hidden=true;else h.element.isConnected=false;
  await flush(h);await promise;reading.dispose();
  assert.equal(h.nodes[1].data,'Pautan rasmi');assert.equal(h.element.style.minHeight,'');assert.equal(h.timers.length,0);
 }
});
test('word segmentation preserves Malay, English, Mandarin, Tamil, punctuation and whitespace',()=>{
 const h=harness();
 for(const text of ['  Salam, dunia!\nBaris kedua.','公务员可以申请年假。','விடுப்பு எப்படி?','N19: RM1,234.50 — 15/2026']){
  const chunks=h.context.sarahWordChunks(text);assert.equal(chunks.join(''),text);assert.ok(chunks.length>1);
 }
});
test('all response paths use progressive display and no completion forces bottom scroll or focus',()=>{
 for(const [start,end] of [['const generateBotResponse =','// Logik teras hantar mesej'],['async function searchDocumentsForSarah(','// Create message element']]){
  const section=source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
  assert.ok(section.includes('await revealSarahAnswer('));
  assert.ok(!section.includes('top: chatBody.scrollHeight'));
  assert.ok(!section.includes('messageInput.focus('));
 }
 const staticReply=source.slice(source.indexOf('const sendStaticReply ='),source.indexOf('// Papar quick replies'));
 assert.ok(staticReply.includes('await revealSarahAnswer('));assert.ok(staticReply.includes('messageInput.disabled = true'));
});
