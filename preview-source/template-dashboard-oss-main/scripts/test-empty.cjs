// Empty-release smoke test: own child process and isolated temporary records.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const {spawn, execFile} = require('node:child_process');
const delay = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const root = path.resolve(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'wanxiang-empty-test-'));
  const review = path.join(temp, 'reviews');
  const data = path.join(temp, 'data');
  await fs.mkdir(data);
  const probe = net.createServer();
  await new Promise(r => probe.listen(0, '127.0.0.1', r));
  const port = probe.address().port;
  await new Promise(r => probe.close(r));
  const origin = `http://127.0.0.1:${port}`;
  let log = '';
  const child = spawn(process.execPath, [path.join(root,'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, windowsHide: true, env: {...process.env, NEXT_TELEMETRY_DISABLED:'1', WANXIANG_DATA_DIR:data, WANXIANG_REVIEW_DIR:review, WANXIANG_NEXT_DIST_DIR:'.next-empty-test'}
  });
  child.stdout.on('data', b => {log += b.toString()});
  child.stderr.on('data', b => {log += b.toString()});
  let startupError;
  child.on('error', e => {startupError = e});
  const get = async route => {
    for(let attempt=0;attempt<3;attempt++) {
      try{return await fetch(origin+route, {signal:AbortSignal.timeout(60000)})}
      catch(e){if(attempt===2)throw new Error(String(e)+'\n'+log.slice(-6000));await delay(1000)}
    }
  };
  try {
    let ready = false;
    for(let n=0;n<120;n++) {
      if(startupError) throw startupError;
      if(child.exitCode!==null) throw new Error('Server exited: '+log.slice(-3000));
      try {const r=await get('/api/wanxiang?period=7'); if(r.status===503) {ready=true;break}} catch {}
      await delay(500);
    }
    assert(ready, 'Empty server failed to start: '+log.slice(-3000));
    for (const period of [7,30]) {
      const r=await get('/api/wanxiang?period='+period); assert.equal(r.status,503);
      assert.match((await r.json()).error,/尚无数据/);
    }
    assert.equal((await get('/api/wanxiang?period=999')).status,400);
    assert.equal((await get('/api/product-catalog')).status,404);
    const reviews=await (await get('/api/reviews')).json();
    assert.deepEqual(reviews.shops,[]); assert.deepEqual(reviews.reviews,[]);
    const denied=await fetch(origin+'/api/reviews',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{}'});
    assert.equal(denied.status,403);
    // Never submit an export or open a browser during the smoke test.
    const deniedCollect=await fetch(origin+'/api/collect',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{"period":7}'});
    assert.equal(deniedCollect.status,403);
    const response=await get('/wanxiang'); assert.equal(response.status,200);
    assert.match(await response.text(),/万相台推广工作台/);
    const home=await fetch(origin+'/',{redirect:'manual'});
    assert([307,308].includes(home.status)); assert.equal(new URL(home.headers.get('location'),origin).pathname,'/wanxiang');
    assert.deepEqual(await fs.readdir(data),[]);
    assert.equal(await fs.stat(review).then(()=>true,()=>false),false);
    console.log('PASS: empty 7/30 data, product waiting state, isolated reviews, cross-origin denial, workbench page and root redirect. No login/collection performed.');
  } finally {
    if(process.platform==='win32' && child.pid) {
      await new Promise(r=>execFile('taskkill',['/PID',String(child.pid),'/T','/F'],()=>r()));
    } else child.kill('SIGTERM');
    const resolved=path.resolve(temp);
    assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep) && path.basename(resolved).startsWith('wanxiang-empty-test-'));
    await fs.rm(resolved,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
