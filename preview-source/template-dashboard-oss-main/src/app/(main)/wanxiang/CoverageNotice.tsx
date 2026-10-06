import {Dataset} from './data'

export default function CoverageNotice({ds}:{ds:Dataset}) {
  const available=new Set(ds.daily.map(r=>r.date)),missing:string[]=[]
  const date=new Date(ds.start+'T00:00:00Z')
  while(date.toISOString().slice(0,10)<=ds.end){const day=date.toISOString().slice(0,10);if(!available.has(day))missing.push(day);date.setUTCDate(date.getUTCDate()+1)}
  if(!missing.length)return null
  return <p role="status" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-700">数据完整性提示：{missing.join('、')}没有日期记录。本页按已有记录分析，不将缺失日期补成0；请先核查原始报表，再判断周期变化。</p>
}
