// Actual panel/scripts, simulated VS Code message bridge; not a live IDE test.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {panelHtml}=require('../view.cjs');
const {analyzePrompt,example}=require('../analyzer.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(panelHtml('testnonce','/revision.js','/panel.js'));}
  else if(['/revision.js','/panel.js'].includes(req.url)){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(root,req.url)));}
  else {res.statusCode=404;res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}: {})});
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.outbox=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.outbox.push(m)});});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const send=data=>page.evaluate(data=>window.dispatchEvent(new MessageEvent('message',{data})),data);
  const last=()=>page.evaluate(()=>window.outbox.at(-1));
  const button=name=>page.getByRole('button',{name,exact:true});
  const review=async()=>{await button('Review prompt').click();assert.equal(await button('Reviewing…').isDisabled(),true);const req=await last();await send({type:'result',id:req.id,result:await analyzePrompt(req.prompt)});return req;};
  await button('Check setup…').click();
  assert.deepEqual(await last(),{type:'claude-action',action:'check'});
  await send({type:'claude-status',text:'Local setup check complete.'});
  assert.equal(await page.locator('#claude-status').textContent(),'Local setup check complete.');
  assert.equal(await button('Review prompt').isDisabled(),true);
  await button('Load file upload example').click();await review();
  assert.equal(await page.locator('.decision').textContent(),'pending');assert.equal(await page.locator('#preview').inputValue(),example);
  await page.getByLabel('Proposed requirement · editable').fill('Edited size requirement');await button('Accept requirement').click();
  assert.match(await page.locator('#preview').inputValue(),/Additional security requirements\n- Edited size requirement/);
  await button('Copy revised prompt').click();const copy=await last();await send({type:'copied',id:copy.id,reviewId:copy.reviewId});assert.match(await page.locator('#status').textContent(),/Prompt copied/);
  await button('Undo decision').click();assert.equal(await page.locator('#preview').inputValue(),example);
  await button('Dismiss').click();assert.equal(await page.locator('.decision').textContent(),'dismissed');
  await page.locator('#draft').fill('Changed');await page.locator('#draft').fill(example);assert.equal(await button('Copy revised prompt').isDisabled(),true);
  await send({type:'copied',id:copy.id,reviewId:copy.reviewId});assert.doesNotMatch(await page.locator('#status').textContent(),/Prompt copied/);
  await button('Review prompt').click();const late=await last();await page.locator('#draft').fill('new draft');await send({type:'result',id:late.id,result:await analyzePrompt(example)});
  assert.equal(await page.locator('article').count(),0);assert.equal(await button('Copy revised prompt').isDisabled(),true);
  await button('Review prompt').click();const failed=await last();await send({type:'review-error',id:failed.id});assert.match(await page.locator('#status').textContent(),/could not be completed/);assert.equal(await page.locator('#draft').inputValue(),'new draft');
  await review();assert.match(await page.locator('#status').textContent(),/does not mean.*secure/);
  await button('Copy revised prompt').click();const failCopy=await last();await send({type:'copy-error',id:failCopy.id,reviewId:failCopy.reviewId});assert.match(await page.locator('#status').textContent(),/copy.*manually/);
  await button('Load file upload example').click();await review();await button('Accept requirement').click();await review();assert.equal(await page.locator('.decision').textContent(),'pending');
  await page.getByLabel('Proposed requirement · editable').fill('Long editable text '.repeat(100));await button('Accept requirement').click();
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  fs.mkdirSync(path.join(root,'dist'),{recursive:true});await page.screenshot({path:path.join(root,'dist/panel-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1200,height:900});await page.screenshot({path:path.join(root,'dist/panel-desktop.png'),fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: Claude setup control bridge, panel decisions, async loading/errors, stale/late results, copy feedback/correlation, unsupported prompts, long text and mobile layout; no browser errors.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
