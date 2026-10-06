"use client"
import {useState} from 'react'
import {aggregate,Metrics} from './data'
import {metricAverages,metricColor} from './metricStyle'

type Pair=Metrics&{productId:string;productName:string;planId:string;planName:string;scene:string}
const identity=(p:Pair)=>JSON.stringify([p.productId,p.planId,p.scene])
const fmt=(n:number|null,d=2)=>n==null?'—':n.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d})
export default function ProductPlanRelations({rows,allRows,productId,planId='',direction='product',start,end}:{rows:Pair[];allRows:Pair[];productId:string;planId?:string;direction?:'product'|'plan';start:string;end:string}){
  const [selected,setSelected]=useState(''),[expanded,setExpanded]=useState(false)
  const byPlan=direction==='plan', rootId=byPlan?planId:productId
  const rootLabel=byPlan?'计划':'商品', childLabel=byPlan?'商品':'计划'
  const nodeName=(p:Pair)=>byPlan?p.productName:p.planName
  const nodeId=(p:Pair)=>byPlan?p.productId:p.planId
  if(!rootId)return <div className="mt-4 rounded-xl border border-dashed bg-gray-50 px-5 py-10 text-center dark:bg-gray-900"><p className="font-medium">先选择一个{rootLabel}，展开它的关联{childLabel}</p><p className="mt-2 text-sm text-gray-500">使用上方“对比{rootLabel}”选择；只展示单元报表能精确关联的关系。</p></div>
  if(!rows.length)return <p role="status" className="mt-4 rounded-lg bg-gray-50 p-5 text-sm text-gray-500 dark:bg-gray-900">当前日期或筛选下没有关联记录。请调整商品、计划或搜索，不将缺失关系当成零表现。</p>
  const scope=allRows.filter(p=>byPlan?p.planId===rootId:p.productId===rootId)
  const total=aggregate(scope)
  const benchmark=metricAverages(scope,total)
  const active=rows.find(p=>identity(p)===selected)
  const shown=expanded?rows:rows.slice(0,12)
  const detailFields:[keyof Metrics,string,number][]=[['spend','花费（元）',2],['revenue','归因成交（元）',2],['roi','ROI（倍）',2],['orders','成交笔数',0],['clicks','点击量',0],['cpc','平均点击花费',2],['favorites','宝贝收藏数',0],['cart','加购数',0]]
  return <div className="mt-4" aria-label={byPlan?'计划商品关系视图':'商品计划关系视图'}>
    <p className="mb-3 text-xs leading-5 text-gray-500">{start} — {end} · 当前{rootLabel} {scope.length} 个{childLabel}×场景关联，筛选显示 {rows.length} 组。红高于该{rootLabel}全部关联组的指标平均值，绿低于；不是盈利评价。线条表示ID关联，不表示流量路径或因果。</p>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 self-start rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900" aria-label={byPlan?'计划与关联商品':'产品与关联计划'}>
        <div className="grid items-start gap-5 md:grid-cols-[210px_minmax(0,1fr)]">
          <div className="md:sticky md:top-20"><p className="mb-2 text-xs font-medium text-gray-500">当前{rootLabel}</p><div className="rounded-xl border border-indigo-200 bg-white p-4 dark:bg-gray-950"><h4 className="break-words text-sm font-semibold">{byPlan?scope[0].planName:scope[0].productName}</h4><p className="mt-2 break-all text-xs text-gray-400">{rootLabel}ID {rootId}</p><div className="mt-4 border-t pt-3 text-xs leading-6 text-gray-500"><p>已覆盖单元花费 <span className="float-right tabular-nums text-gray-900 dark:text-gray-100">{fmt(total.spend)}</span></p><p>已覆盖单元ROI <span className="float-right tabular-nums text-gray-900 dark:text-gray-100">{fmt(total.roi)}</span></p></div><p className="mt-3 text-[11px] leading-5 text-gray-400">仅汇总该{rootLabel}关联单元，不是{rootLabel}总报表。不受节点搜索或另一维度筛选影响。</p></div></div>
          <div className="min-w-0"><p className="mb-2 text-xs font-medium text-gray-500">关联{childLabel} · 点击节点查看详情</p><ul className="space-y-3 border-l-2 border-indigo-200 pl-5 dark:border-indigo-900">{shown.map(p=><li key={identity(p)} className="relative"><span aria-hidden="true" className="absolute -left-5 top-7 w-5 border-t-2 border-indigo-200 dark:border-indigo-900"/><button aria-label={`查看关联${childLabel} ${nodeName(p)} · ${nodeId(p)} · ${p.scene}`} aria-pressed={!!active&&identity(active)===identity(p)} onClick={()=>setSelected(identity(p))} className={`w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${active&&identity(active)===identity(p)?'border-indigo-400 bg-indigo-50 dark:bg-indigo-950':'border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-950'}`}><span className="block text-sm font-semibold">{nodeName(p)}</span><span className="mt-1 block break-all text-[11px] text-gray-400">{p.scene} · {childLabel}ID {nodeId(p)}</span><span className="mt-3 grid grid-cols-3 gap-2 text-xs">{(['spend','roi','orders'] as const).map((k,i)=><span key={k}><span className="block text-gray-500">{['花费（元）','ROI','成交笔数'][i]}</span><span className={`mt-1 block font-semibold tabular-nums ${metricColor(k,p[k],benchmark[k])}`}>{fmt(p[k],k==='orders'?0:2)}</span></span>)}</span></button></li>)}</ul>{rows.length>12&&<button onClick={()=>setExpanded(!expanded)} className="mt-3 rounded-md border bg-white px-3 py-2 text-xs text-indigo-600">{expanded?'收起到前12组':`展开全部 ${rows.length} 组`}</button>}</div>
        </div>
      </div>
      <aside aria-label={`关联${childLabel}详情`} className="self-start rounded-xl border border-gray-200 bg-white p-4 xl:sticky xl:top-20 dark:border-gray-800 dark:bg-gray-950">
        {active?<><div className="flex items-start justify-between gap-2"><div><p className="text-xs text-indigo-600">该产品在此计划中的表现</p><h4 className="mt-2 break-words font-semibold">{nodeName(active)}</h4></div><button aria-label={`关闭关联${childLabel}详情`} onClick={()=>setSelected('')} className="shrink-0 whitespace-nowrap rounded border px-2 py-1 text-xs text-gray-500">关闭</button></div><p className="mt-2 break-all text-xs text-gray-400">{active.scene} · 计划 {active.planName} · 计划ID {active.planId} · 商品ID {active.productId}</p><div className="mt-4 grid grid-cols-2 gap-3">{detailFields.map(([key,label,d])=><div key={key} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900"><p className="text-[11px] text-gray-500">{label}</p><p className={`mt-2 text-lg font-semibold tabular-nums ${metricColor(key,active[key],benchmark[key])}`}>{fmt(active[key],d)}</p></div>)}</div><p className="mt-4 text-xs leading-6 text-gray-500">按主体ID×计划ID×场景合并多个单元后重算。不是计划整体数据；当前仅覆盖已有单元报表场景，不与商品总报表相加。样本量和归因延迟仍需核查，ROI不是利润率。</p></>:<div className="py-10 text-center"><h4 className="text-sm font-medium">点一个{childLabel}，详情在这里打开</h4><p className="mt-2 text-xs leading-6 text-gray-500">{rootLabel}和关联关系保持在左侧，方便连续切换{childLabel}比较。</p></div>}
      </aside>
    </div>
  </div>
}
