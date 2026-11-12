const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {configure,status}=require('../hook-setup.cjs');
const {findNode,localCheck,registerClaudeCommands}=require('../claude-integration.cjs');
function project(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),"secnudge project's "));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
test('installed runtime works independently of download location; setup self-check and disable',async t=>{
 const p=project(t);assert.equal(status(p).configured,false);
 assert.equal(configure('enable',p),true);const state=status(p);assert.equal(state.configured,true);
 assert.equal(state.nodePath,process.execPath);assert.match(await localCheck(p,process.execPath),/Local hook test passed/);
 const saved=JSON.parse(fs.readFileSync(path.join(state.runtime,'installed.json')));
 assert.match(saved.command,/secnudge\/hook.cjs/);assert.doesNotMatch(saved.command,/integrations/);
 assert.equal(configure('enable',p),false);
 configure('disable',p);assert.equal(status(p).configured,false);assert.equal(fs.existsSync(state.runtime),true);
 assert.match(await localCheck(p,process.execPath),/not enabled/);
});
test('preserves non-command hooks and recognizes node path updates',t=>{
 const p=project(t);fs.mkdirSync(path.join(p,'.claude'));
 const file=path.join(p,'.claude/settings.local.json');const promptHook={hooks:[{type:'prompt',prompt:'An unrelated hook'}]};
 fs.writeFileSync(file,JSON.stringify({hooks:{UserPromptSubmit:[promptHook,{hooks:[]}]}}));
 configure('enable',p);configure('enable',p,{nodePath:'/different/node'});
 let entries=JSON.parse(fs.readFileSync(file)).hooks.UserPromptSubmit;
 assert.equal(entries.length,3);assert.deepEqual(entries[0],promptHook);assert.equal(status(p).nodePath,'/different/node');
 configure('disable',p);entries=JSON.parse(fs.readFileSync(file)).hooks.UserPromptSubmit;assert.deepEqual(entries,[promptHook,{hooks:[]}]);
});
test('refuses edited runtime, unknown folders, and disabled-all settings without replacing them',t=>{
 const p=project(t);configure('enable',p);const file=path.join(p,'.claude/secnudge/analyzer.cjs');
 fs.appendFileSync(file,'\n// research edits');assert.throws(()=>configure('enable',p),/edited/);assert.match(fs.readFileSync(file,'utf8'),/research edits/);
 const unknown=project(t);fs.mkdirSync(path.join(unknown,'.claude/secnudge'),{recursive:true});assert.throws(()=>configure('enable',unknown),/not managed/);
 const disabled=project(t);fs.mkdirSync(path.join(disabled,'.claude'));fs.writeFileSync(path.join(disabled,'.claude/settings.local.json'),JSON.stringify({disableAllHooks:true}));assert.throws(()=>configure('enable',disabled),/disableAllHooks/);assert.equal(fs.existsSync(path.join(disabled,'.claude/secnudge')),false);
});
test('actual generated shell command handles project paths containing spaces and apostrophes',t=>{
 const p=project(t);configure('enable',p);const info=JSON.parse(fs.readFileSync(path.join(p,'.claude/secnudge/installed.json')));
 const result=spawnSync('/bin/sh',['-c',info.command],{input:JSON.stringify({prompt:'Build an endpoint to upload files'}),encoding:'utf8'});
 assert.equal(result.status,0);assert.equal(JSON.parse(result.stdout).decision,'block');
});
test('Node discovery checks versions and uses normal Mac locations',async()=>{
 const calls=[];
 const found=await findNode(async candidate=>{calls.push(candidate);if(candidate==='node')return {stdout:JSON.stringify({major:16,path:'/old/node'})};return {stdout:JSON.stringify({major:24,path:'/opt/homebrew/bin/node'})};});
 assert.equal(found,'/opt/homebrew/bin/node');assert.equal(calls.length,2);
 await assert.rejects(findNode(async()=>{throw Error('missing')}),/Node.js 18/);
});
test('setup command cancel and untrusted workspace do not write settings',async()=>{
 const commands={},messages=[];
 const vscode={workspace:{isTrusted:true},commands:{registerCommand:(id,fn)=>{commands[id]=fn;return {dispose(){}};}},window:{showOpenDialog:async()=>undefined,showInformationMessage:m=>messages.push(m),showErrorMessage:m=>messages.push(m)}};
 registerClaudeCommands(vscode,{subscriptions:[]});assert.equal(Object.keys(commands).length,3);
 assert.match(await commands['secnudge.enableClaudeHook'](),/canceled/);
 vscode.workspace.isTrusted=false;assert.match(await commands['secnudge.disableClaudeHook'](),/Trust this workspace/);
});
test('VS Code setup command workflow installs, tests and removes only the chosen project hook',async t=>{
 const p=project(t),commands={},messages=[];
 const vscode={workspace:{isTrusted:true},commands:{registerCommand:(id,fn)=>{commands[id]=fn;return {dispose(){}};}},window:{showOpenDialog:async()=>[{scheme:'file',fsPath:p}],showInformationMessage:m=>messages.push(m),showErrorMessage:m=>messages.push(m)}};
 registerClaudeCommands(vscode,{subscriptions:[]});
 assert.match(await commands['secnudge.enableClaudeHook'](),/enabled/);assert.equal(status(p).configured,true);
 assert.match(await commands['secnudge.checkClaudeHook'](),/Local hook test passed/);
 assert.match(await commands['secnudge.disableClaudeHook'](),/disabled/);assert.equal(status(p).configured,false);
 assert.equal(messages.length,3);
});
