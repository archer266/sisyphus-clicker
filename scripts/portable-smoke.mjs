import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

await mkdir('test-results',{recursive:true});
const profile=path.join(await mkdtemp(path.resolve('test-results/portable-')), 'new-user-data');
const executable=path.resolve('release/Sisyphus-Clicker-Portable-1.1.0.exe');
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;await new Promise(resolve=>server.close(resolve));
const env={...process.env,SISYPHUS_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
let child,browser,page;
const errors=[];
async function launch(){
  child=spawn(executable,[`--remote-debugging-port=${port}`],{env,windowsHide:true,stdio:'ignore'});
  const deadline=Date.now()+45000;
  while(true){
    try{const response=await fetch(`http://127.0.0.1:${port}/json/version`);if(response.ok)break;}catch{}
    if(Date.now()>deadline)throw new Error('Portable launcher did not open the desktop game');
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  page=browser.contexts()[0].pages()[0];page.on('pageerror',e=>errors.push(e.message));
  await browser.contexts()[0].setOffline(true);await page.reload();await page.bringToFront();
  await page.locator('#resume').waitFor();
  assert.ok(page.url().startsWith('file:'));
}
async function close(){
  if(page && !page.isClosed())await page.close();
  if(browser)await browser.close();page=null;browser=null;
  await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,5000);});
}
try{
  await launch();await page.locator('#resume').click();await page.locator('#push').click();
  assert.equal(await page.locator('#total').textContent(),'1');
  await page.locator('#pause').click();await page.screenshot({path:'test-results/portable.png'});
  await close();await launch();assert.equal(await page.locator('#total').textContent(),'1');
  assert.deepEqual(errors,[]);
  const report={result:'PASS',executable,profile,checks:['portable self-extraction and launch','offline file loading','click input','pause','persistent save across portable relaunch','no runtime errors']};
  await writeFile('test-results/portable-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await close();}
