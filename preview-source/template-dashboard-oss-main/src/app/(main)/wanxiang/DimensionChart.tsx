"use client"
import { useState } from "react"
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, BarChart, Bar } from "recharts"
type Point = { id: string; name: string; spend: number | null; revenue: number | null; roi: number | null }
const fmt = (v: number | null) => v === null ? "—" : v.toLocaleString("zh-CN", {maximumFractionDigits:2})
export default function DimensionChart<T extends Point>({rows, region, onSelect}: {rows:T[]; region:boolean; onSelect:(r:T)=>void}) {
  const [metric, setMetric] = useState<"spend"|"revenue"|"roi">("spend")
  const valid = rows.filter(r => r.spend !== null && r.spend > 0 && r.roi !== null && r.revenue !== null)
  const ranked = [...rows].filter(r => r[metric] !== null).sort((a,b)=>(b[metric]??0)-(a[metric]??0)).slice(0,15)
  const detail = ({active,payload}: {active?:boolean; payload?:{payload?:T}[]}) => {
    const r = payload?.[0]?.payload
    return active && r ? <div className="max-w-72 rounded border bg-white p-3 text-xs text-gray-900 shadow"><p className="mb-2 font-medium">{r.name}</p><p>花费 ¥{fmt(r.spend)}</p><p>归因成交 ¥{fmt(r.revenue)}</p><p>ROI {fmt(r.roi)} 倍</p><p className="mt-2">点击查看汇总明细</p></div> : null
  }
  return <section aria-label={region ? "地域对比图" : "花费与ROI气泡图"} className="min-w-0 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
    <h2 className="font-semibold">{region ? "地域表现对比" : "花费与ROI · 投放分布"}</h2>
    {region && <div className="mt-3 flex gap-2">{(["spend","revenue","roi"] as const).map(k=><button key={k} onClick={()=>setMetric(k)} className={`rounded px-3 py-1 text-xs ${metric===k ? "bg-indigo-50 text-indigo-600":"text-gray-500"}`}>{{spend:"地域花费",revenue:"地域成交",roi:"地域ROI"}[k]}</button>)}</div>}
    <p className="mt-2 text-xs leading-5 text-gray-500">{region ? "所选指标前15个省份 · 地域报表覆盖范围，不等于整体" : `横轴花费（元） · 纵轴ROI（倍） · 气泡面积代表归因成交 · 搜索联动 · ${rows.length-valid.length}项零花费或缺失数据未绘制`}</p>
    <div className={`mt-5 ${region ? "h-[440px]":"h-80"}`}>
    {region ? <ResponsiveContainer width="100%" height="100%"><BarChart data={ranked} layout="vertical" margin={{left:10,right:20}}><CartesianGrid horizontal={false} strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:11}} tickFormatter={fmt}/><YAxis type="category" dataKey="name" width={70} tick={{fontSize:12}}/><Tooltip content={detail}/><Bar dataKey={metric} fill="#6366f1" isAnimationActive={false} onClick={r=>onSelect(r as T)} style={{cursor:"pointer"}}/></BarChart></ResponsiveContainer> : valid.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{left:8,right:20,bottom:20,top:10}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" dataKey="spend" domain={[0,"auto"]} tick={{fontSize:11}} tickFormatter={fmt} label={{value:"花费（元）",position:"insideBottom",offset:-12}}/><YAxis type="number" dataKey="roi" domain={[0,"auto"]} width={60} tick={{fontSize:11}}/><ZAxis type="number" dataKey="revenue" range={[40,700]}/><Tooltip content={detail}/><ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="4 4" label={{value:"ROI=1（非盈亏线）",fontSize:10,position:"insideTopRight"}}/><Scatter data={valid} fill="#6366f1" fillOpacity={0.65} isAnimationActive={false} onClick={r=>onSelect(r as T)} style={{cursor:"pointer"}}/></ScatterChart></ResponsiveContainer> : <p className="py-16 text-center text-gray-500">没有可绘制的数据</p>}
    </div>
    <details className="mt-3 text-xs text-gray-500"><summary className="cursor-pointer">选择项目查看明细（支持键盘）</summary><div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">{(region?ranked:valid).map(r=><button key={r.id} onClick={()=>onSelect(r)} className="max-w-64 truncate rounded border px-2 py-1 text-indigo-600">{r.name}</button>)}</div></details>
  </section>
}
