export type Metrics = { spend: number | null; revenue: number | null; orders: number | null; clicks: number | null; impressions: number | null; roi: number | null; ctr: number | null; cpc: number | null; favorites:number|null; cart:number|null; storeFavorites:number|null; directCart:number|null; indirectCart:number|null; directRevenue:number|null; indirectRevenue:number|null; directOrders:number|null; indirectOrders:number|null }
export type Row = Metrics & {id:string; name:string; scene:string; identityNames?:string[]}
export type Detail = Row & {date:string}
export type Field = {name:string;status:string;missing:number}
export type RawRow = {date:string;id:string;values:Record<string,string>}
export type Dataset = {total:Metrics; rows:Row[]; daily:(Metrics & {date:string})[]; details:Detail[]; planDetails?:(Detail & {planId:string})[]; fieldCatalog?:Field[];rawRows?:RawRow[]; start:string; end:string; sourceRows:number}
export function aggregate(rows:Metrics[]): Metrics {
  const sum = (key:keyof Metrics) => rows.length && rows.every(r=>r[key]!=null) ? rows.reduce((n,r)=>n+(r[key] as number),0) : null
  const spend=sum('spend'), revenue=sum('revenue'), orders=sum('orders'), clicks=sum('clicks'), impressions=sum('impressions')
  return {spend,revenue,orders,clicks,impressions,favorites:sum('favorites'),cart:sum('cart'),storeFavorites:sum('storeFavorites'),directCart:sum('directCart'),indirectCart:sum('indirectCart'),directRevenue:sum('directRevenue'),indirectRevenue:sum('indirectRevenue'),directOrders:sum('directOrders'),indirectOrders:sum('indirectOrders'),roi:spend && revenue!==null ? revenue/spend:null,ctr:impressions && clicks!==null ? clicks/impressions*100:null,cpc:clicks && spend!==null ? spend/clicks:null}
}
export function filterDates(ds:Dataset, start:string, end:string):Dataset {
  const details=ds.details.filter(r=>r.date>=start && r.date<=end)
  const groups=new Map<string,Detail[]>(), days=new Map<string,Detail[]>()
  details.forEach(r=>{groups.set(r.id,[...(groups.get(r.id)||[]),r]); days.set(r.date,[...(days.get(r.date)||[]),r])})
  const names=new Map<string,Set<string>>()
  ;(ds.rawRows||[]).filter(r=>r.date>=start&&r.date<=end).forEach(r=>{const name=r.values['词名字/词包名字'];if(name)names.set(r.id,new Set([...(Array.from(names.get(r.id)||[])),name]))})
  const entries=Array.from(groups.values()).map(g=>{const row={...g[g.length-1],...aggregate(g)};const variants=Array.from(names.get(row.id)||[]);return variants.length>1?{...row,name:`身份待核实（ID ${row.id}）`,identityNames:variants}:row})
  return {...ds,start,end,details,total:aggregate(details),rows:entries.sort((a,b)=>(b.spend??0)-(a.spend??0)),daily:Array.from(days).sort(([a],[b])=>a.localeCompare(b)).map(([date,g])=>({date,...aggregate(g)}))}
}

// Missing calendar dates are null chart slots, never artificial zero records.
export function calendarSeries(records:(Metrics&{date:string})[],start:string,end:string){
  const byDate=new Map(records.map(r=>[r.date,r])),result:(Metrics&{date:string})[]=[]
  const date=new Date(start+'T00:00:00Z')
  while(date.toISOString().slice(0,10)<=end){const day=date.toISOString().slice(0,10);result.push(byDate.get(day)||{date:day,...aggregate([])});date.setUTCDate(date.getUTCDate()+1)}
  return result
}
