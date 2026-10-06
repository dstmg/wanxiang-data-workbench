"use client"
import {useState} from 'react'
import {Dataset} from './data'
export default function AllFields({ds,id}:{ds:Dataset;id?:string}) {
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState<string[]|null>(null)
  const [page,setPage]=useState(1)
  const catalog=ds.fieldCatalog||[]
  const visible=catalog.filter(f=>f.name.includes(query))
  const raw=(ds.rawRows||[]).filter(r=>r.date>=ds.start&&r.date<=ds.end&&(!id||r.id===id))
  const columns=selected??['花费','总购物车数','收藏宝贝数','收藏店铺数','总收藏加购数','成交新客数'].filter(c=>catalog.some(f=>f.name===c))
  const toggle=(name:string)=>{const current=columns;setSelected(current.includes(name)?current.filter(c=>c!==name):[...current,name]);setPage(1)}
  return <details className="mt-5 rounded-lg border border-gray-200 p-4 text-xs"><summary className="cursor-pointer font-medium">全部字段与每日原始值 · {catalog.length}列</summary><p className="mt-3 leading-5 text-gray-500">这些是官方导出原值，不是周期汇总。同一天可能有多条不同维度记录；不自动相加，不把新客数当去重人数。— 表示缺失，0保留为0。状态仅代表工作台处理方式。</p>
    <input aria-label="搜索报表字段" placeholder="搜索字段，如收藏、加购、新客…" value={query} onChange={e=>setQuery(e.target.value)} className="mt-3 w-full rounded border-gray-200 text-xs"/>
    <div className="mt-3 max-h-56 overflow-y-auto space-y-2">{visible.map(f=><label key={f.name} className="flex items-start gap-2"><input type="checkbox" checked={columns.includes(f.name)} onChange={()=>toggle(f.name)}/><span>{f.name}<span className="ml-2 text-gray-500">{f.status} · 源文件缺失{f.missing}行</span></span></label>)}{!visible.length&&<p>没有匹配字段</p>}</div>
    <div className="mt-4 max-h-80 overflow-auto"><table className="min-w-full whitespace-nowrap"><thead className="sticky top-0 bg-gray-50 text-gray-600"><tr><th className="p-2">日期</th><th className="p-2">源项目ID</th>{columns.map(c=><th key={c} className="p-2">{c}</th>)}</tr></thead><tbody>{raw.slice((page-1)*20,page*20).map((r,i)=><tr key={`${r.date}-${r.id}-${i}`} className="border-t"><td className="p-2">{r.date}</td><td className="p-2">{r.id}</td>{columns.map(c=>{const v=r.values[c];return <td key={c} className="p-2 text-right">{v===undefined?'未提供':v===''||v==='-'||v==='\\N'?'—':v}</td>})}</tr>)}</tbody></table>{!raw.length&&<p className="p-4">当前日期没有原始记录</p>}</div>
    <div className="mt-3 flex justify-between gap-2"><span>{raw.length}条源记录 · 每页20条</span><div className="flex gap-3"><button disabled={page<=1} onClick={()=>setPage(page-1)}>原值上一页</button><span>{page}/{Math.max(1,Math.ceil(raw.length/20))}</span><button disabled={page*20>=raw.length} onClick={()=>setPage(page+1)}>原值下一页</button></div></div>
  </details>
}
