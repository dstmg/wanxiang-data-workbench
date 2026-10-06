"use client"
import {useEffect,useRef,useState} from "react"
import {createPortal} from 'react-dom'
import styles from './floatingPanel.module.css'
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid} from "recharts"
import {Dataset,Row,calendarSeries} from "./data"
import AllFields from './AllFields'
import {metricColor,detailMetrics,metricAverages} from './metricStyle'
const fmt=(v:number|null)=>v===null?"—":v.toLocaleString('zh-CN',{maximumFractionDigits:2})
export default function DetailDrawer({row,ds,close,product,units,onRecord}:{row:Row;ds:Dataset;close:()=>void;product:boolean;units?:Row[];onRecord?:()=>void}) {
  const ref=useRef<HTMLDivElement>(null)
  const [metric,setMetric]=useState<'spend'|'revenue'|'roi'>('spend')
  const daily=ds.details.filter(r=>r.id===row.id)
  const chartDaily=calendarSeries(daily,ds.start,ds.end)
  const benchmarks=metricAverages(ds.rows,ds.total)
  const dailyBenchmarks=metricAverages(daily)
  useEffect(()=>{
    const old=document.activeElement as HTMLElement
    const overflow=document.body.style.overflow
    document.body.style.overflow='hidden';ref.current?.focus()
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape') close();if(e.key==='Tab'){const items=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')||[]).filter(item=>item.getClientRects().length>0);if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
    document.addEventListener('keydown',key)
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);old?.focus()}
  },[close])
  return createPortal(<div className={`${styles.backdrop} z-[60]`} onClick={close}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="项目详情" onClick={e=>e.stopPropagation()} className={`${styles.panel} overflow-y-auto bg-white p-4 md:p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100`}>
    <div className="sticky top-0 z-30 flex justify-between gap-4 border-b bg-white py-3 dark:bg-gray-950"><h2 className="text-lg font-semibold">{row.name}</h2><div className="flex gap-2">{onRecord&&<button onClick={onRecord} className="rounded-lg border px-3 py-2 text-sm text-indigo-600">记这个项目的问题</button>}<button onClick={close} className="shrink-0 rounded-lg border px-3 py-2 text-sm text-indigo-600">关闭明细 ×</button></div></div><p className="mt-2 text-xs text-gray-500">ID {row.id} · {row.scene} · {ds.start} — {ds.end}</p>
    {row.identityNames&&<p role="status" className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">该ID对应多个名称：{row.identityNames.join('、')}。此处是ID级混合记录，暂不能把效果归到其中一个名称；需核验来源身份，不自动拆分或停投。</p>}
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{detailMetrics.slice(0,8).map(([k,label])=><div key={k} className="rounded-lg border bg-gray-50/50 p-3 dark:bg-gray-900"><p className="text-xs text-gray-500">{label}</p><p className={"mt-2 text-2xl font-semibold tabular-nums "+metricColor(k,row[k],benchmarks[k])}>{fmt(row[k])}</p></div>)}</div>
    <p className="mt-4 text-xs text-gray-500">上方指标与当前报表各项平均值比较：高于标红、低于标绿，零值灰色；不代表好坏。花费占当前报表 {fmt(ds.total.spend&&row.spend!==null?row.spend/ds.total.spend*100:null)}% · 成交占当前报表 {fmt(ds.total.revenue&&row.revenue!==null?row.revenue/ds.total.revenue*100:null)}%</p>
    <div className="mt-6 grid gap-6 xl:grid-cols-2"><section className="min-w-0 rounded-lg border p-4"><h3 className="font-semibold">单项每日表现</h3><div className="mt-3 flex gap-3">{(['spend','revenue','roi'] as const).map(k=><button key={k} onClick={()=>setMetric(k)} className={`rounded px-3 py-1 text-sm ${metric===k?'bg-indigo-50 text-indigo-600':'text-gray-500'}`}>{{spend:'单项花费',revenue:'单项成交',roi:'单项ROI'}[k]}</button>)}</div>
    <div className="mt-4 h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartDaily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={v=>v.slice(5)} tick={{fontSize:11}}/><YAxis width={60} domain={[0,'auto']} tick={{fontSize:11}}/><Tooltip/><Line dataKey={metric} stroke="#6366f1" connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>
    <p className="mt-2 text-xs text-gray-500">完整日期轴；缺失日期留空、不连线，不把未记录日期当零。ROI不是利润率。</p>
    </section><section className="min-w-0 rounded-lg border p-4"><h3 className="font-semibold">每日完整指标</h3><p className="mt-2 text-xs text-gray-500">与该项目当前日期范围内的每日平均值比较：高于标红、低于标绿，零值与缺失灰色；不代表好坏。</p><div className="mt-4 max-h-[460px] overflow-auto"><table className="w-full whitespace-nowrap text-xs"><thead className="sticky top-0 bg-gray-50 dark:bg-gray-900"><tr><th className="p-2 text-left">日期</th>{detailMetrics.map(([k,label])=><th key={k} className="p-2 text-right">{label}</th>)}</tr></thead><tbody>{daily.map(r=><tr key={r.date} className="border-t"><td className="p-2">{r.date}</td>{detailMetrics.map(([k])=><td key={k} className={"p-2 text-right tabular-nums "+metricColor(k,r[k],dailyBenchmarks[k])}>{fmt(r[k])}</td>)}</tr>)}</tbody></table></div></section></div>
    <AllFields ds={ds} id={row.id}/>
    {product&&<p className="mt-5 text-xs text-gray-500">商品总报表没有计划ID，不能据此推测关联；“总结与分析”可依据单元报表的主体ID与计划ID查看关键词推广场景的精确关联。</p>}
    {units && <section className="mt-6"><h3 className="font-semibold">关联推广单元 · {units.length}项</h3><p className="mt-2 text-xs text-gray-500">按官方单元报表中的计划ID准确匹配；与计划是同一投放的不同视角，不重复相加。关键词、人群和创意报表没有计划ID，暂不关联。</p><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{units.map(r=><div key={r.id} className="rounded border p-3 text-xs"><p>{r.name}</p><p className="mt-1 text-gray-500">花费 ¥{fmt(r.spend)} · 成交 ¥{fmt(r.revenue)} · ROI {fmt(r.roi)} · 宝贝收藏 {fmt(r.favorites)} · 加购 {fmt(r.cart)}</p></div>)}</div></section>}
  </div></div>,document.body)
}
