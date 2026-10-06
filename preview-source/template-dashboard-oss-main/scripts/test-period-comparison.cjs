const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
function compile(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, {exports, require: n => imports[n], Date, Set, Map});
  return exports;
}
const root = 'src/app/(main)/wanxiang/';
const data = compile(root + 'data.ts');
const {previousPeriod, periodChange} = compile(root + 'periodComparison.ts', {'./data': data});
const details = Array.from({length: 30}, (_, i) => ({date: `2026-09-${String(i + 1).padStart(2, '0')}`, id: 'x', name: 'x', scene: 's', spend: i + 1, revenue: (i + 1) * 2, orders: 1, clicks: 10, impressions: 100}));
const source = data.filterDates({details}, '2026-09-01', '2026-09-30');
for (const days of [1, 2, 7, 15]) {
  const current = data.filterDates(source, `2026-09-${String(31-days).padStart(2,'0')}`, '2026-09-30');
  const result = previousPeriod(current, source);
  assert.equal(result.days, days);
  assert.equal(result.end, `2026-09-${String(30-days).padStart(2,'0')}`);
  assert.equal(result.previous.details.length, days);
  assert.equal(result.start, `2026-09-${String(31-2*days).padStart(2,'0')}`);
}
assert.equal(previousPeriod(source, source).reason, '上周期超出已下载范围');
const incomplete = {...source, daily: source.daily.filter(r=>r.date!=='2026-09-29')};
assert.match(previousPeriod(data.filterDates(source,'2026-09-30','2026-09-30'),incomplete).reason,/2026-09-29/);
assert.match(previousPeriod(data.filterDates(source,'2026-09-29','2026-09-30'),incomplete).reason,/2026-09-29/);
assert.equal(periodChange(120,100).text,'↑ 上升 20.00%');
assert.equal(periodChange(80,100).text,'↓ 下降 20.00%');
assert.equal(periodChange(0,0).text,'持平 0.00%');
assert.match(periodChange(1,0).text,/上期为0/);
assert.match(periodChange(null,10).text,/无法比较/);
const calendar=data.calendarSeries(source.daily.filter(r=>r.date!=='2026-09-19'&&r.date!=='2026-09-20'),'2026-09-01','2026-09-30');
assert.equal(calendar.length,30);
assert.equal(calendar[18].spend,null);
assert.equal(calendar[19].roi,null);
assert.equal(calendar[20].date,'2026-09-21');
const conflict=data.filterDates({...source,rawRows:[{date:'2026-09-08',id:'x',values:{'词名字/词包名字':'甲'}},{date:'2026-09-08',id:'x',values:{'词名字/词包名字':'乙'}}]},source.start,source.end);
assert.match(conflict.rows[0].name,/身份待核实/);
assert.equal(conflict.rows[0].identityNames.length,2);
assert.equal(conflict.total.spend,source.total.spend);
assert.equal(conflict.total.revenue,source.total.revenue);
const noConflict=data.filterDates({...source,rawRows:[{date:'2026-09-08',id:'x',values:{'词名字/词包名字':'甲'}},{date:'2026-09-30',id:'x',values:{'词名字/词包名字':'乙'}}]},'2026-09-30','2026-09-30');
assert.equal(noConflict.rows[0].identityNames,undefined);
// Private-data regression is opt-in; public tests use synthetic records only.
for(const period of process.env.WANXIANG_TEST_PRIVATE_DATA === '1' ? [7,30] : []){
  const actual=JSON.parse(fs.readFileSync(`../../data/dashboard-${period}.json`,'utf8'));
  for(const [view,ds] of Object.entries(actual.datasets)){
    const filtered=data.filterDates(ds,ds.start,ds.end);
    for(const field of ['spend','revenue','orders','clicks','impressions','favorites','cart']){
      if(ds.total[field]===null)assert.equal(filtered.total[field],null);
      else assert.ok(Math.abs(filtered.total[field]-ds.total[field])<1e-6,`${period}/${view}/${field}`);
    }
  }
}
console.log('PASS: equal-length ranges, coverage, missing dates, increase/decrease, zero and null');
