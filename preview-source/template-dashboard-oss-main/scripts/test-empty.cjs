// Empty-release smoke test: own child process and isolated temporary records.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const {spawn, execFile} = require('node:child_process');
const delay = ms => new Promise(r => setTimeout(r, ms));
const demo = process.argv.includes('--demo');
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
    cwd: root, windowsHide: true, env: {...process.env, NEXT_TELEMETRY_DISABLED:'1', WANXIANG_DEMO:demo?'1':'0', WANXIANG_DATA_DIR:data, WANXIANG_REVIEW_DIR:review, WANXIANG_DEMO_REVIEW_DIR:path.join(temp,'demo-reviews'), WANXIANG_NEXT_DIST_DIR:demo?'.next-demo-test':'.next-empty-test'}
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
      try {const r=await get('/api/wanxiang?period=7'); if(r.status===(demo?200:503)) {ready=true;break}} catch {}
      await delay(500);
    }
    assert(ready, 'Empty server failed to start: '+log.slice(-3000));
    for (const period of [7,30]) {
      const r=await get('/api/wanxiang?period='+period); assert.equal(r.status,demo?200:503);
      const body=await r.json();
      if(demo){assert.equal(body.demo,true);assert(body.reportKey.startsWith('demo-'));assert.equal(body.datasets.overview.daily.length,period);for(const kind of ['plans','products','units'])for(const metric of ['spend','revenue','orders','clicks','impressions'])assert.equal(body.datasets[kind].total[metric],body.datasets.overview.total[metric]);assert(body.datasets.units.rawRows.every(r=>r.values['主体ID'].startsWith('demo-')));}else assert.match(body.error,/尚无数据/);
    }
    assert.equal((await get('/api/wanxiang?period=999')).status,400);
    const catalog=await get('/api/product-catalog');assert.equal(catalog.status,demo?200:404);
    if(demo){const c=await catalog.json();assert.equal(c.products.length,4);assert(c.products.every(p=>p.url===''&&p.image===''));assert(c.reportKeys.includes('demo-synthetic-v1-7'));}
    const reviews=await (await get('/api/reviews')).json();
    assert.deepEqual(reviews.shops,[]); assert.deepEqual(reviews.reviews,[]);
    const denied=await fetch(origin+'/api/reviews',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{}'});
    assert.equal(denied.status,403);
    // Never submit an export or open a browser during the smoke test.
    const deniedCollect=await fetch(origin+'/api/collect',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{"period":7}'});
    assert.equal(deniedCollect.status,403);
    if(demo){for(const route of ['/api/collect','/api/report-folder'])assert.equal((await fetch(origin+route,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{"period":7}'})).status,403);const saved=await fetch(origin+'/api/reviews',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({revision:0,op:'createShop',name:'虚拟店铺测试'})});assert.equal(saved.status,200);assert.equal((await (await get('/api/reviews')).json()).shops.length,1);assert.equal(await fs.stat(path.join(temp,'demo-reviews','reviews.json')).then(()=>true,()=>false),true);}
    const response=await get('/wanxiang'); assert.equal(response.status,200);
    assert.match(await response.text(),/万相台推广工作台/);
    const home=await fetch(origin+'/',{redirect:'manual'});
    assert([307,308].includes(home.status)); assert.equal(new URL(home.headers.get('location'),origin).pathname,'/wanxiang');
    assert.deepEqual(await fs.readdir(data),[]);
    assert.equal(await fs.stat(review).then(()=>true,()=>false),false);
    console.log(demo?'PASS: synthetic data reconcile, catalog, isolated writable reviews, real collection/folder denied, page and redirect.':'PASS: empty data, isolated reviews, cross-origin denial, page and redirect.');
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
