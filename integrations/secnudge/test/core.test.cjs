const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const { analyzePrompt, createAnalyzer, example } = require('../analyzer.cjs');
const { assemblePrompt } = require('../revision.js');
const { evaluateHook } = require('../hook.cjs');
const item = (decision, requirement) => ({ decision, requirement });
test('only accepted, nonblank additions appear and original whitespace is preserved',()=>{
  assert.equal(assemblePrompt('  original\n','  original\n',[item('pending','omit'),item('dismissed','omit'),item('accepted','edited requirement'),item('accepted',' ')]),'  original\n\n\nAdditional security requirements\n- edited requirement');
});
test('unchanged with no acceptance; outdated drafts including edit-and-revert cannot be copied',()=>{
  assert.equal(assemblePrompt('original','original',[]),'original');
  assert.equal(assemblePrompt('old','new',[]),null);
  assert.equal(assemblePrompt('same','same',[],true),null);
});
test('mock fixture is deterministic and returns independent objects',async()=>{
  const result = await analyzePrompt(example+'.'); assert.equal(result.suggestions.length,1);
  result.suggestions[0].requirement='edit';
  assert.notEqual((await analyzePrompt(example)).suggestions[0].requirement,'edit');
  const unsupported=await analyzePrompt('Build a weather widget');
  assert.equal(unsupported.supported,false); assert.deepEqual(unsupported.suggestions,[]);
  assert.match(unsupported.message,/does not mean.*secure/);
});
test('adapter accepts async implementations and rejects malformed results, errors and timeouts',async()=>{
  const result=await analyzePrompt(example);
  assert.deepEqual(await createAnalyzer({analyze:async()=>result})(example),result);
  await assert.rejects(createAnalyzer({analyze:async()=>({})})(example),/Invalid/);
  await assert.rejects(createAnalyzer({analyze:async()=>({...result,suggestions:[result.suggestions[0],result.suggestions[0]]})})(example),/Invalid suggestion/);
  await assert.rejects(createAnalyzer({analyze:async()=>{throw Error('backend down')}})(example),/backend down/);
  await assert.rejects(createAnalyzer({analyze:()=>new Promise(()=>{})},10)(example),/timed out/);
});
test('hook blocks the fixture with mock provenance, awaits backend, and allows revised/unsupported prompts',async()=>{
  const block=await evaluateHook({prompt:example}); assert.equal(block.decision,'block'); assert.match(block.reason,/not a security prediction/);
  assert.equal(await evaluateHook({prompt:example+' with a configurable maximum size'}),null);
  assert.equal(await evaluateHook({prompt:'unrelated'}),null);
  assert.equal((await evaluateHook({prompt:example},async()=>analyzePrompt(example))).decision,'block');
});
test('CLI protocol emits valid block JSON and fails open without echoing bad input',()=>{
  const hook=path.resolve(__dirname,'../hook.cjs');
  const blocked=spawnSync(process.execPath,[hook],{input:JSON.stringify({prompt:example}),encoding:'utf8'});
  assert.equal(blocked.status,0);assert.equal(JSON.parse(blocked.stdout).decision,'block');
  const allowed=spawnSync(process.execPath,[hook],{input:JSON.stringify({prompt:'other'}),encoding:'utf8'});
  assert.equal(allowed.status,0);assert.equal(allowed.stdout,'');
  const failure=spawnSync(process.execPath,[hook],{input:'PRIVATE BAD INPUT',encoding:'utf8'});
  assert.equal(failure.status,1);assert.equal(failure.stdout,'');assert.doesNotMatch(failure.stderr,/PRIVATE/);assert.match(failure.stderr,/not blocked/);
});
