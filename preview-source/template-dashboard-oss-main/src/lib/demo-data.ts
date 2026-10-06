// Synthetic fixtures: never read customer files or link to real products.
import {aggregate,filterDates,type Dataset,type Detail,type Metrics} from '@/app/(main)/wanxiang/data'
export const demoMode=()=>process.env.WANXIANG_DEMO==='1'
const names={overview:['关键词推广'],plans:['演示·稳定计划','演示·待核查计划'],products:['演示·便携杯','演示·收纳盒','演示·零花费商品','演示·报表新增商品'],regions:['上海','江苏','广东'],keywords:['演示便携杯','演示收纳盒','演示高点击词'],audiences:['演示·兴趣人群','演示·复购人群'],units:['演示·杯子单元A','演示·杯子单元B','演示·收纳单元','演示·零花费单元','演示·新增单元'],creatives:['演示·创意A','演示·创意B']}
type Kind=keyof typeof names
const ids:Partial<Record<Kind,string[]>>={plans:['demo-plan-a','demo-plan-b'],products:['demo-product-a','demo-product-b','demo-product-zero','demo-product-new']}
function metrics(spend:number,revenue:number,clicks:number):Metrics{
  const orders=Math.floor(revenue/60),directOrders=Math.floor(orders*.6),directRevenue=Math.round(revenue*.6*100)/100
  return aggregate([{spend,revenue,orders,clicks,impressions:clicks*25,favorites:Math.floor(clicks*.08),cart:Math.floor(clicks*.2),storeFavorites:Math.floor(clicks*.02),directCart:Math.floor(clicks*.12),indirectCart:Math.floor(clicks*.2)-Math.floor(clicks*.12),directRevenue,indirectRevenue:revenue-directRevenue,directOrders,indirectOrders:orders-directOrders,roi:null,ctr:null,cpc:null}])
}
export function demoDashboard(period:string){
  const datasets={} as Record<Kind,Dataset>
  for(const kind of Object.keys(names) as Kind[]){
    const details:Detail[]=[],rawRows:NonNullable<Dataset['rawRows']>=[],planDetails:NonNullable<Dataset['planDetails']>=[]
    for(let day=0;day<30;day++){
      const date=new Date(Date.UTC(2026,8,1+day)).toISOString().slice(0,10)
      const atoms=[metrics(Math.round((30+day%5)*(day>=23?1.2:1)),180+day*3,28+day%7),metrics(42+day%4,day%4===0?0:30,35+day%8),metrics(18+day%3,100+day*2,15+day%3),metrics(0,0,0),metrics(10,45,9)]
      const groups:Partial<Record<Kind,number[][]>>={overview:[[0,1,2,3,4]],plans:[[0,2,3],[1,4]],products:[[0,1],[2],[3],[4]],units:[[0],[1],[2],[3],[4]]}
      names[kind].forEach((name,i)=>{
        const value=groups[kind]?aggregate(groups[kind]![i].map(n=>atoms[n])):metrics(15+i*17+day%5,kind==='keywords'&&i===2?0:(i+1)*65+day,20+i*12+day%4)
        const id=ids[kind]?.[i]||`demo-${kind}-${i}`,row={date,id,name,scene:'关键词推广',...value};details.push(row)
        if(kind==='units'){
          const planId=i===1||i===4?'demo-plan-b':'demo-plan-a',productId=['demo-product-a','demo-product-a','demo-product-b','demo-product-zero','demo-product-new'][i]
          planDetails.push({...row,planId});rawRows.push({date,id,values:{'主体ID':productId,'计划ID':planId,'计划名字':planId==='demo-plan-a'?names.plans[0]:names.plans[1],'场景名字':'关键词推广'}})
        }
      })
    }
    const start=period==='7'?'2026-09-24':'2026-09-01',end='2026-09-30'
    const ds=filterDates({total:aggregate(details),rows:[],daily:[],details,start,end,sourceRows:details.length,rawRows,planDetails},start,end)
    ds.rawRows=rawRows.filter(r=>r.date>=start);ds.planDetails=planDetails.filter(r=>r.date>=start);ds.sourceRows=ds.details.length;datasets[kind]=ds
  }
  return {demo:true,reportKey:`demo-synthetic-v1-${period}`,generatedAt:'2026-09-30T00:00:00Z',datasets,sources:Object.keys(names).map(type=>({type,file:'内置虚拟数据（非真实店铺）',rows:datasets[type as Kind].details.length}))}
}
export function demoCatalog(){return {source:'内置虚拟产品清单',snapshotDate:'2026-09-30',sameShopConfirmed:true,reportKeys:['demo-synthetic-v1-7','demo-synthetic-v1-30'],products:['a','b','zero','none'].map((key,i)=>({id:`demo-product-${key}`,name:['演示·便携杯','演示·收纳盒','演示·零花费商品','演示·无记录商品'][i],image:'',price:59+i*10,sales:100+i*20,sku:'虚拟规格',url:''}))}}
