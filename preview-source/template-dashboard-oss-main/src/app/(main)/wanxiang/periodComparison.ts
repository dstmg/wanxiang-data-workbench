import {Dataset,filterDates} from './data'
const shift=(date:string,days:number)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export function previousPeriod(current:Dataset,source?:Dataset|null){
  const days=Math.round((Date.parse(current.end)-Date.parse(current.start))/86400000)+1
  const start=shift(current.start,-days),end=shift(current.start,-1)
  const dates=(a:string,b:string)=>{const result:string[]=[];for(let d=a;d<=b;d=shift(d,1))result.push(d);return result}
  if(!source)return {days,start,end,previous:null,reason:'正在读取上周期本地数据'}
  if(start<source.start||end>source.end)return {days,start,end,previous:null,reason:'上周期超出已下载范围'}
  const available=new Set(source.daily.map(r=>r.date))
  const missing=dates(start,end).filter(d=>!available.has(d)),currentMissing=dates(current.start,current.end).filter(d=>!available.has(d))
  if(missing.length||currentMissing.length)return {days,start,end,previous:null,reason:`日期记录不完整：${[...currentMissing,...missing].join('、')}；不补0比较`}
  return {days,start,end,previous:filterDates(source,start,end),reason:''}
}
export function periodChange(current:number|null,previous:number|null){
  if(current==null||previous==null)return {text:'缺失值，无法比较',color:'text-gray-400'}
  if(current===previous)return {text:'持平 0.00%',color:'text-gray-500'}
  if(previous===0)return {text:current>0?'↑ 上期为0，新增':'↓ 上期为0',color:current>0?'text-red-600':'text-emerald-700'}
  const change=(current-previous)/Math.abs(previous)*100
  return {text:`${change>0?'↑ 上升':'↓ 下降'} ${Math.abs(change).toFixed(2)}%`,color:change>0?'text-red-600':'text-emerald-700'}
}
