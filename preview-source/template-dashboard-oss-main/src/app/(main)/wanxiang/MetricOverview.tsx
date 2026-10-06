"use client"
import {useEffect,useRef,useState} from 'react'
import {RiSettings3Line} from '@remixicon/react'
import {Dataset,Metrics} from './data'
import {periodChange,previousPeriod} from './periodComparison'

type Key=keyof Metrics|'cpm'|'cvr'|'orderCost'|'favoriteCost'|'cartCost'
type Field={key:Key;name:string;group:string;unit:string;digits:number;description:string}
const fields:Field[]=[
  {key:'impressions',name:'展现量',group:'基础流量',unit:'次',digits:0,description:'源报表展现量求和'},
  {key:'clicks',name:'点击量',group:'基础流量',unit:'次',digits:0,description:'源报表点击量求和'},
  {key:'spend',name:'报表覆盖花费',group:'基础流量',unit:'元',digits:2,description:'当前报表花费求和，不等于账户账单总花费'},
  {key:'ctr',name:'点击率',group:'基础流量',unit:'%',digits:2,description:'合计点击量 ÷ 合计展现量 × 100，不直接平均每日点击率'},
  {key:'cpc',name:'平均点击花费',group:'基础流量',unit:'元',digits:2,description:'合计花费 ÷ 合计点击量'},
  {key:'cpm',name:'千次展现花费',group:'基础流量',unit:'元',digits:2,description:'合计花费 ÷ 合计展现量 × 1000'},
  {key:'revenue',name:'归因成交金额',group:'成交与效率',unit:'元',digits:2,description:'源报表总成交金额求和，末次点击归因、15天累计口径'},
  {key:'orders',name:'成交笔数',group:'成交与效率',unit:'笔',digits:0,description:'源报表总成交笔数求和，非去重买家数'},
  {key:'roi',name:'投入产出比 ROI',group:'成交与效率',unit:'倍',digits:2,description:'归因成交金额 ÷ 花费，非利润率'},
  {key:'cvr',name:'点击转化率',group:'成交与效率',unit:'%',digits:2,description:'合计成交笔数 ÷ 合计点击量 × 100，非去重买家转化率'},
  {key:'orderCost',name:'成交成本',group:'成交与效率',unit:'元/笔',digits:2,description:'合计花费 ÷ 合计成交笔数，非产品成本或毛利'},
  {key:'directRevenue',name:'直接成交金额',group:'成交与效率',unit:'元',digits:2,description:'源报表直接成交金额求和，与总成交不可重复相加'},
  {key:'indirectRevenue',name:'间接成交金额',group:'成交与效率',unit:'元',digits:2,description:'源报表间接成交金额求和，与总成交不可重复相加'},
  {key:'directOrders',name:'直接成交笔数',group:'成交与效率',unit:'笔',digits:0,description:'源报表直接成交笔数求和'},
  {key:'indirectOrders',name:'间接成交笔数',group:'成交与效率',unit:'笔',digits:0,description:'源报表间接成交笔数求和'},
  {key:'favorites',name:'宝贝收藏数',group:'收藏与加购',unit:'次',digits:0,description:'源字段收藏宝贝数求和，非周期去重人数'},
  {key:'storeFavorites',name:'店铺收藏数',group:'收藏与加购',unit:'次',digits:0,description:'源字段收藏店铺数求和，与宝贝收藏分开统计'},
  {key:'cart',name:'加购数',group:'收藏与加购',unit:'次',digits:0,description:'源字段总购物车数求和，非周期去重人数'},
  {key:'directCart',name:'直接加购数',group:'收藏与加购',unit:'次',digits:0,description:'源报表直接购物车数求和，与总加购不可重复相加'},
  {key:'indirectCart',name:'间接加购数',group:'收藏与加购',unit:'次',digits:0,description:'源报表间接购物车数求和，与总加购不可重复相加'},
  {key:'favoriteCost',name:'宝贝收藏成本',group:'收藏与加购',unit:'元/次',digits:2,description:'合计花费 ÷ 合计宝贝收藏数'},
  {key:'cartCost',name:'加购成本',group:'收藏与加购',unit:'元/次',digits:2,description:'合计花费 ÷ 合计加购数'},
]
const defaults:Key[]=['spend','revenue','roi','orders','favorites','cart','impressions','clicks','ctr','cpc','storeFavorites','cvr']
export function overviewValue(total:Metrics,key:Key):number|null {
  const ratio=(a:number|null,b:number|null,factor=1)=>a!=null&&b!=null&&b>0?a/b*factor:null
  if(key==='cpm')return ratio(total.spend,total.impressions,1000)
  if(key==='cvr')return ratio(total.orders,total.clicks,100)
  if(key==='orderCost')return ratio(total.spend,total.orders)
  if(key==='favoriteCost')return ratio(total.spend,total.favorites)
  if(key==='cartCost')return ratio(total.spend,total.cart)
  return total[key]
}
const fmt=(value:number|null,digits:number)=>value==null?'—':value.toLocaleString('zh-CN',{minimumFractionDigits:digits,maximumFractionDigits:digits})
export default function MetricOverview({ds,view,label,history}:{ds:Dataset;view:string;label:string;history?:Dataset|null}) {
  const comparison=previousPeriod(ds,history)
  const [selected,setSelected]=useState<Key[]>(defaults)
  const [draft,setDraft]=useState<Key[]>(defaults)
  const [open,setOpen]=useState(false)
  const [search,setSearch]=useState('')
  const [expanded,setExpanded]=useState(true)
  const dialog=useRef<HTMLDivElement>(null)
  const storage='wanxiang-overview-metrics-v1-'+view
  useEffect(()=>{let next=defaults;try{const saved=JSON.parse(localStorage.getItem(storage)||'null');if(Array.isArray(saved)){const valid=Array.from(new Set(saved)).filter((key):key is Key=>fields.some(f=>f.key===key));if(valid.length)next=valid}}catch{}setSelected(next);setExpanded(true);setOpen(false)},[storage])
  useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement;const old=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.focus();const handle=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);if(e.key==='Tab'){const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')||[]);const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',handle);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',handle);previous?.focus()}},[open])
  const visible=(expanded?selected:selected.slice(0,6)).map(key=>fields.find(f=>f.key===key)!)
  const move=(index:number,delta:number)=>setDraft(old=>{const next=[...old];[next[index],next[index+delta]]=[next[index+delta],next[index]];return next})
  const apply=()=>{setSelected([...draft]);setExpanded(true);try{localStorage.setItem(storage,JSON.stringify(draft))}catch{}setOpen(false)}
  return <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950" aria-label="核心指标">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5 dark:border-gray-800"><div><h2 className="text-xl font-semibold">数据汇总 <span className="ml-2 text-sm font-normal text-gray-500">{label}</span></h2><p className="mt-2 text-xs text-gray-500">{ds.start} — {ds.end} · 已选{selected.length}项 · 当前日期范围汇总，不受明细搜索或TOP筛选影响</p><p className="mt-2 text-xs text-gray-500">上周期：{comparison.start} — {comparison.end}（{comparison.days}天） · {comparison.reason||'红色上升 / 绿色下降，不代表好坏'} · 两期使用各自本地快照，归因成熟度可能不同</p></div><button onClick={()=>{setDraft([...selected]);setSearch('');setOpen(true)}} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700"><RiSettings3Line aria-hidden="true" className="size-4"/>自定义指标</button></div>
    <div className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-3 xl:grid-cols-6 dark:bg-gray-800">{visible.map((f,i)=>{const value=overviewValue(ds.total,f.key);const previous=comparison.previous?overviewValue(comparison.previous.total,f.key):null;const change=periodChange(value,previous);return <div key={f.key} className={`min-w-0 px-5 py-6 ${i<6?'bg-indigo-50/40 dark:bg-gray-900':'bg-white dark:bg-gray-950'}`} data-metric={f.key}><p className="text-sm text-gray-500" title={f.description}>{f.name}<span className="ml-1 cursor-help text-xs text-gray-400" title={f.description} aria-label={f.description}>ⓘ</span></p><p className={`mt-4 break-words text-3xl font-bold tracking-tight tabular-nums ${value===null?'text-gray-400':'text-gray-900 dark:text-gray-100'}`}>{fmt(value,f.digits)}</p><p className="mt-2 text-xs text-gray-400">{f.unit} · {f.group}</p><p data-comparison={f.key} title={comparison.reason||`上期 ${comparison.start} — ${comparison.end}：${fmt(previous,f.digits)}${f.unit}`} className={`mt-3 text-xs ${comparison.previous?change.color:'text-gray-400'}`}>{comparison.previous?change.text:'上周期不可比'}{comparison.previous&&<span className="mt-1 block text-gray-500">上期 {fmt(previous,f.digits)} {f.unit}</span>}</p></div>})}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-xs text-gray-500"><span>ROI非利润率；收藏加购非去重人数；缺失显示“—”。汇总卡不与单项平均值比较。</span>{selected.length>6&&<button onClick={()=>setExpanded(!expanded)} className="rounded px-3 py-2 text-indigo-600">{expanded?'收起更多指标':`展开全部${selected.length}项`}</button>}</div>
    {open&&<div className="fixed inset-0 z-[70] !m-0 flex items-center justify-center bg-black/30 p-3 md:p-6" onClick={()=>setOpen(false)}><div ref={dialog} role="dialog" aria-modal="true" aria-label="选择汇总指标" tabIndex={-1} onClick={e=>e.stopPropagation()} className="flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-xl dark:bg-gray-950 dark:text-gray-100">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4"><div><h2 className="text-lg font-semibold">选择数据字段</h2><p className="mt-1 text-xs text-gray-500">22项可汇总指标 · 选择并调整展示顺序 · 分页面保存</p></div><button aria-label="关闭指标设置" onClick={()=>setOpen(false)} className="rounded border px-3 py-2">关闭</button></div>
      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_300px]"><div className="p-5"><input aria-label="搜索汇总指标" value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索字段名称或口径…" className="mb-5 w-full rounded-lg border-gray-200 text-sm"/>{['基础流量','成交与效率','收藏与加购'].map(group=>{const options=fields.filter(f=>f.group===group&&`${f.name} ${f.description}`.includes(search));return options.length?<section key={group} className="mb-6"><h3 className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold dark:bg-gray-900">{group}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{options.map(f=><label key={f.key} className="flex items-start gap-2 rounded px-2 py-2 text-sm" title={f.description}><input type="checkbox" className="mt-0.5" checked={draft.includes(f.key)} disabled={draft.length===1&&draft.includes(f.key)} onChange={()=>setDraft(draft.includes(f.key)?draft.filter(k=>k!==f.key):[...draft,f.key])}/><span>{f.name}<span className="mt-1 block text-xs leading-4 text-gray-500">{f.description}</span></span></label>)}</div></section>:null})}{!fields.some(f=>`${f.name} ${f.description}`.includes(search))&&<p className="py-10 text-center text-sm text-gray-500">没有匹配的字段</p>}<p className="text-xs leading-5 text-gray-500">新客、预售等未确认周期口径的字段仍可在明细页“全部字段与每日原始值”查看，本区不擅自汇总。</p></div>
      <aside className="border-t bg-gray-50 p-5 md:border-l md:border-t-0 dark:bg-gray-900"><h3 className="mb-3 text-sm font-semibold">已选择 {draft.length}项 · 展示顺序</h3><div className="space-y-2">{draft.map((key,index)=><div key={key} className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 dark:bg-gray-950"><span className="text-xs">{index+1}. {fields.find(f=>f.key===key)!.name}</span><div className="flex shrink-0 gap-1"><button aria-label={`上移${fields.find(f=>f.key===key)!.name}`} disabled={index===0} onClick={()=>move(index,-1)} className="rounded border px-2 py-1 text-xs disabled:opacity-30">↑</button><button aria-label={`下移${fields.find(f=>f.key===key)!.name}`} disabled={index===draft.length-1} onClick={()=>move(index,1)} className="rounded border px-2 py-1 text-xs disabled:opacity-30">↓</button></div></div>)}</div></aside></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"><button onClick={()=>{setDraft([...defaults]);setSearch('')}} className="text-sm text-indigo-600">恢复默认12项</button><div className="flex gap-3"><button onClick={()=>setOpen(false)} className="rounded-lg border px-5 py-2 text-sm">取消</button><button onClick={apply} disabled={!draft.length} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white disabled:opacity-40">确定展示</button></div></div>
    </div></div>}
  </section>
}
