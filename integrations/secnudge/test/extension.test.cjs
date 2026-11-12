const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {createRequire} = require('node:module');
const source=path.resolve(__dirname,'../extension.cjs');
const realRequire=createRequire(source);
function host(analyze) {
 let command, receive, dispose;
 const messages=[]; const clipboard=[];
 const panel={webview:{asWebviewUri:p=>p,postMessage:async m=>messages.push(m),onDidReceiveMessage:fn=>{receive=fn;return {dispose(){}};}},onDidDispose:fn=>{dispose=fn;}};
 const vscode={commands:{registerCommand:(name,fn)=>{if(name==='secnudge.review')command=fn;return {dispose(){}};}},window:{createWebviewPanel:()=>panel},ViewColumn:{Beside:2},Uri:{joinPath:(base,file)=>base+'/'+file},env:{clipboard:{writeText:async text=>clipboard.push(text)}}};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(source,'utf8'),{module,require:name=>name==='vscode'?vscode:name==='./analyzer.cjs'?{analyzePrompt:analyze}:realRequire(name)});
 const context={extensionUri:'vscode-resource:/extension',subscriptions:[]};module.exports.activate(context);command();
 return {receive:msg=>receive(msg),dispose:()=>dispose(),messages,clipboard,panel};
}
test('extension awaits adapter, correlates results, and validates webview messages',async()=>{
 const h=host(async()=>({supported:true,suggestions:[]}));
 await h.receive(null);await h.receive({type:'review',id:1,prompt:' '});assert.equal(h.messages.length,0);
 await h.receive({type:'review',id:2,prompt:'prompt'});
 assert.equal(h.messages[0].type,'result');assert.equal(h.messages[0].id,2);
 await h.receive({type:'copy',id:3,reviewId:1,text:'stale'});assert.deepEqual(h.clipboard,[]);
 await h.receive({type:'copy',id:4,reviewId:2,text:'revised'});assert.deepEqual(h.clipboard,['revised']);assert.equal(h.messages.at(-1).type,'copied');
 assert.match(h.panel.webview.html,/default-src 'none'/);assert.doesNotMatch(h.panel.webview.html,/unsafe-inline/);
});
test('extension reports adapter failure and suppresses disposed results',async()=>{
 let resolve;const h=host(()=>new Promise(r=>resolve=r));
 const pending=h.receive({type:'review',id:1,prompt:'old'});h.dispose();resolve({suggestions:[]});await pending;assert.equal(h.messages.length,0);
 const failed=host(async()=>{throw Error('PRIVATE DETAILS')});await failed.receive({type:'review',id:1,prompt:'draft'});assert.equal(failed.messages[0].type,'review-error');assert.doesNotMatch(JSON.stringify(failed.messages),/PRIVATE/);
});
test('newer review supersedes an older unresolved analysis',async()=>{
 const resolvers={};const h=host(prompt=>new Promise(resolve=>resolvers[prompt]=resolve));
 const old=h.receive({type:'review',id:1,prompt:'old'});
 const newer=h.receive({type:'review',id:2,prompt:'new'});
 resolvers.new({suggestions:[]});await newer;
 resolvers.old({suggestions:[]});await old;
 assert.equal(h.messages.length,1);assert.equal(h.messages[0].id,2);
});
