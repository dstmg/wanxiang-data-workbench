import {Metrics} from './data'
export function metricColor(_key:string,value:number|null,benchmark?:number|null) {
  if(value==null||value===0)return 'text-gray-400'
  if(benchmark!=null)return value>benchmark?'text-red-600 dark:text-red-400':value<benchmark?'text-emerald-700 dark:text-emerald-400':'text-gray-700 dark:text-gray-200'
  return 'text-gray-900 dark:text-gray-100'
}
export type MetricBaseline=Partial<Record<keyof Metrics|'spendShare'|'revenueShare',number|null>>
// Arithmetic mean of valid values, including zero; not a profitability threshold.
export function metricAverages(rows:Metrics[],total?:Metrics):MetricBaseline {
  const result:MetricBaseline={}
  for(const key of detailMetrics.map(([key])=>key)) {
    const values=rows.map(row=>row[key]).filter((value):value is number=>value!=null&&Number.isFinite(value))
    result[key]=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null
  }
  for(const [share,key] of [['spendShare','spend'],['revenueShare','revenue']] as const) {
    const denominator=total?.[key]
    result[share]=denominator&&result[key]!=null?result[key]!/denominator*100:null
  }
  return result
}
export const detailMetrics:[keyof Metrics,string,number][]=[['spend','花费（元）',2],['revenue','归因成交（元）',2],['roi','ROI（倍）',2],['orders','成交笔数',0],['favorites','宝贝收藏数',0],['cart','加购数',0],['ctr','点击率（%）',2],['cpc','平均点击花费',2],['clicks','点击量',0],['impressions','展现量',0],['storeFavorites','店铺收藏数',0],['directCart','直接加购数',0],['indirectCart','间接加购数',0],['directRevenue','直接成交金额',2],['indirectRevenue','间接成交金额',2],['directOrders','直接成交笔数',0],['indirectOrders','间接成交笔数',0]]
