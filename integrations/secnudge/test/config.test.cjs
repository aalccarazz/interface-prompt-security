const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {configure,command} = require('../scripts/configure-hook.cjs');
test('hook configuration preserves unrelated settings, is idempotent, backs up, and can be removed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'secnudge-config-'));
 try {
  fs.mkdirSync(path.join(root,'.claude'));
  const file=path.join(root,'.claude/settings.local.json');
  const initial={permissions:{allow:['Read']},hooks:{UserPromptSubmit:[{hooks:[{type:'command',command:'existing-check'}]}],Stop:[]}};
  fs.writeFileSync(file,JSON.stringify(initial));
  assert.equal(configure('enable',root),true);
  assert.equal(configure('enable',root),false);
  const active=JSON.parse(fs.readFileSync(file));
  assert.equal(active.hooks.UserPromptSubmit.length,2);
  assert.equal(active.hooks.UserPromptSubmit[1].hooks[0].command,command(root));
  assert.deepEqual(JSON.parse(fs.readFileSync(file+'.secnudge-backup')),initial);
  assert.equal(configure('disable',root),true);
  assert.deepEqual(JSON.parse(fs.readFileSync(file)),initial);
  assert.equal(configure('disable',root),false);
  fs.writeFileSync(file,'bad JSON');
  assert.throws(()=>configure('enable',root)); assert.equal(fs.readFileSync(file,'utf8'),'bad JSON');
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
