"use client"
import {Dataset} from './data'
const fmt=(v:number|null)=>v===null?'—':v.toLocaleString('zh-CN',{maximumFractionDigits:2})
export default function Summary({overall,plans,full,onExpand,onPlan}:{overall:Dataset;plans:Dataset;full:boolean;onExpand:()=>void;onPlan:()=>void}) {
  const zero=plans.rows.filter(r=>r.spend!==null&&r.spend>0&&r.revenue===0)
  const zeroSpend=zero.reduce((n,r)=>n+(r.spend||0),0)
  const largest=[...plans.rows].sort((a,b)=>(b.spend??-1)-(a.spend??-1))[0]
  return <section aria-label="事实摘要" className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 dark:bg-indigo-950/30">
    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{full?'总结与分析':'本期简报'}</h2>{!full&&<button onClick={onExpand} className="text-xs text-indigo-600">查看完整摘要 →</button>}</div>
    <p className="mt-2 text-xs text-gray-500">{overall.start} — {overall.end} · 基于当前查看日期，不受明细搜索和TOP筛选影响 · 事实摘要，不是投放建议</p>
    <p className="mt-3 text-sm leading-6">报表覆盖花费 ¥{fmt(overall.total.spend)}，归因成交 ¥{fmt(overall.total.revenue)}，ROI {fmt(overall.total.roi)}；宝贝收藏 {fmt(overall.total.favorites)}，加购 {fmt(overall.total.cart)}。</p>
    <p className="mt-2 text-xs leading-5 text-gray-500">整体来自营销场景报表，不是账户账单总花费。ROI为归因成交金额÷花费，非利润率；收藏宝贝数、总购物车数按源记录求和，非去重人数，不与计划、产品等视图相加。</p>
    {full&&<div className="mt-4 space-y-4 text-sm">
      <div className="rounded border bg-white p-4 dark:bg-gray-950"><h3 className="font-medium">计划结构</h3><p className="mt-2 leading-6">当前有 {plans.rows.length} 个计划。{largest?`花费最多的是「${largest.name}」，花费 ¥${fmt(largest.spend)}，ROI ${fmt(largest.roi)}。`:'当前范围没有计划记录。'}</p><button onClick={onPlan} className="mt-2 text-xs text-indigo-600">查看计划明细 →</button></div>
      <div className="rounded border bg-white p-4 dark:bg-gray-950"><h3 className="font-medium">需要人工核查的记录</h3><p className="mt-2 leading-6">有花费但归因成交金额为0的计划：{zero.length} 个，涉及花费 ¥{fmt(zeroSpend)}。</p><p className="mt-2 text-xs text-gray-500">零成交不等于无效投放；请结合投放目标、归因延迟和收藏加购查看，不自动建议停投。</p></div>
    </div>}
  </section>
}
