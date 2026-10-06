"use client"
import {useEffect,useRef,useState,ReactNode} from 'react'
import {Dataset,Metrics,Row,calendarSeries} from './data'
import {metricAverages,metricColor} from './metricStyle'
import styles from './visualInsights.module.css'

// Geometry ported from lieflat-charts Basics F2/F4/F5/F6/F7/F12.
// Red/green override requested by user; grayscale supports additional segments.
const C={BG:'#ffffff',TXT:'#1c1c1a',MUT:'#64645f',GRID:'#deddd6',DATA:'#b91c1c',HERO:'#047857',CAT:['#b91c1c','#047857','#64645f','#969690','#bdbdb6','#deddd6']}
const fmt=(n:number|null,d=2)=>n==null?'—':n.toLocaleString('zh-CN',{maximumFractionDigits:d})
const num=(n:number|null)=>n??0
const brief=(name:string)=>name.length>12?name.slice(0,12)+'…':name
const pol=(r:number,a:number)=>[200+r*Math.cos(a),145+r*Math.sin(a)]
function Card({title,note,children,tools,source}:{title:string;note:string;children:ReactNode;tools?:ReactNode;source:string}) {
  const ref=useRef<HTMLElement>(null)
  const [visible,setVisible]=useState(false)
  useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{threshold:.1});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect()},[])
  return <section ref={ref} aria-label={title} className={`min-w-0 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950 ${visible?styles.reveal:''}`}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{title}</h2>{tools}</div><p className="mt-2 text-xs leading-5 text-gray-500">{note}</p><div className="mt-3 overflow-x-auto">{children}</div><p className="mt-3 text-xs text-gray-500">{source}</p></section>
}
function Svg({children,height=290,label}:{children:ReactNode;height?:number;label:string}) {return <svg role="img" aria-label={label} viewBox={`0 0 520 ${height}`} className="w-full min-w-[320px]" style={{color:C.TXT}}>{children}</svg>}
const clickProps=(row:Row,onSelect:(row:Row)=>void)=>({role:'button',tabIndex:0,'aria-label':'查看'+row.name,onClick:()=>onSelect(row),onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(row)}}})
export default function VisualInsights({ds,overview,view,rows,onSelect,metric,top}:{ds:Dataset;overview:boolean;view:string;rows:Row[];onSelect:(r:Row)=>void;metric:keyof Metrics;top:number}) {
  const [rankCount,setRankCount]=useState(10)
  const [composition,setComposition]=useState<'spend'|'revenue'>('spend')
  const [trend,setTrend]=useState<'spend'|'revenue'>('spend')
  const benchmark=metricAverages(ds.rows,ds.total)
  const daily=calendarSeries(ds.daily,ds.start,ds.end)
  const ranked=[...rows].sort((a,b)=>(b[metric]??-Infinity)-(a[metric]??-Infinity)).slice(0,rankCount)
  const rankMax=Math.max(1,...ranked.map(r=>num(r[metric])))
  const ranksHeight=Math.max(180,ranked.length*34+40)
  const maxMoney=Math.max(1,...daily.map(r=>num(r[trend])))
  const maxROI=Math.max(1,...daily.map(r=>num(r.roi)))
  const labelDays=new Set(Array.from({length:Math.min(7,daily.length)},(_,i)=>Math.round(i*(daily.length-1)/Math.max(1,Math.min(7,daily.length)-1))))
  const x=(i:number)=>55+i*420/Math.max(1,daily.length-1)
  const y=(v:number,max:number)=>225-v/max*170
  const path=(key:keyof Metrics,max:number)=>{let connected=false;return daily.map((r,i)=>{if(r[key]==null){connected=false;return ''}const part=`${connected?'L':'M'}${x(i)} ${y(r[key]!,max)}`;connected=true;return part}).join(' ')}
  const engagementMax=Math.max(1,...daily.flatMap(r=>[num(r.favorites),num(r.cart)]))
  const unit=engagementMax/35
  const compositionRows=[...ds.rows].filter(r=>r[composition]!=null&&r[composition]!>0).sort((a,b)=>num(b[composition])-num(a[composition]))
  const segments=compositionRows.slice(0,5).map(r=>({name:r.name,value:r[composition]!,row:r as Row|null}))
  if(compositionRows.length>5)segments.push({name:'其他',value:compositionRows.slice(5).reduce((s,r)=>s+r[composition]!,0),row:null})
  const total=ds.total[composition]
  const complete=ds.rows.every(r=>r[composition]!=null)&&total!=null&&total>0
  const shareRows=[...rows].sort((a,b)=>num(b.spend)-num(a.spend)).slice(0,8)
  const share=(v:number|null,t:number|null)=>t&&v!=null?v/t*100:null
  const shareMax=Math.max(1,...shareRows.flatMap(r=>[num(share(r.spend,ds.total.spend)),num(share(r.revenue,ds.total.revenue))]))
  const directRows=[...rows].sort((a,b)=>num(b.revenue)-num(a.revenue)).slice(0,4)
  const directMax=Math.max(1,...directRows.map(r=>num(r.directRevenue)+num(r.indirectRevenue)))
  const titles:Partial<Record<keyof Metrics,string>>={spend:'花费',revenue:'成交金额',roi:'ROI',orders:'成交笔数',favorites:'宝贝收藏',cart:'加购',clicks:'点击量',ctr:'点击率',cpc:'点击成本'}
  return <div className="grid gap-5 xl:grid-cols-2" aria-label="可视化洞察">
    {['overview','plans','products'].includes(view)&&<Card title="每日投入与ROI走势" note={`红线：${trend==='spend'?'花费':'成交金额'}（元，左轴） · 绿虚线：ROI（倍，右轴） · 两轴各自刻度，不表示因果`} source={`${ds.start} — ${ds.end} · 当前报表每日数据 · 缺失值不连线`} tools={<select aria-label="趋势金额指标" value={trend} onChange={e=>setTrend(e.target.value as typeof trend)} className="rounded border-gray-200 text-xs"><option value="spend">花费与ROI</option><option value="revenue">成交与ROI</option></select>}>
      <Svg label="每日投入与ROI双轴折线"><g fontSize="11" fill={C.MUT}>{[0,.25,.5,.75,1].map(t=><g key={t}><line x1="55" y1={y(t*maxMoney,maxMoney)} x2="475" y2={y(t*maxMoney,maxMoney)} stroke={C.GRID} strokeDasharray="2 4"/><text x="47" y={y(t*maxMoney,maxMoney)+4} textAnchor="end">{fmt(t*maxMoney,0)}</text><text x="481" y={y(t*maxMoney,maxMoney)+4}>{fmt(t*maxROI,1)}</text></g>)}</g>
      <path d={path(trend,maxMoney)} fill="none" stroke={C.DATA} strokeWidth="2"/><path d={path('roi',maxROI)} fill="none" stroke={C.HERO} strokeWidth="2" strokeDasharray="5 3"/>
      {daily.map((r,i)=><g key={r.date}><line x1={x(i)} y1="225" x2={x(i)} y2="232" stroke={C.GRID}/>{r[trend]!=null&&<circle cx={x(i)} cy={y(r[trend]!,maxMoney)} r="3" fill={C.DATA}><title>{r.date} · 金额 {fmt(r[trend])}元 · ROI {fmt(r.roi)}倍</title></circle>}{r.roi!=null&&<circle cx={x(i)} cy={y(r.roi,maxROI)} r="3" fill={C.BG} stroke={C.HERO}><title>{r.date} · ROI {fmt(r.roi)}倍</title></circle>}{labelDays.has(i)&&<text x={x(i)} y="253" fontSize="11" fill={C.MUT} textAnchor="middle">{r.date.slice(5)}</text>}</g>)}</Svg>
    </Card>}
    {['overview','audiences'].includes(view)&&<Card title="收藏与加购每日变化" note="红色：宝贝收藏数 · 绿色：加购数 · 同一计数刻度，并列而非转化漏斗" source="当前报表源记录求和，非去重人数 · 每档刻度按比例缩放">
      <Svg label="收藏与加购每日并列刻度柱"><line x1="45" y1="225" x2="490" y2="225" stroke={C.GRID}/>{daily.map((r,i)=>{const cx=55+(i+.5)*420/Math.max(1,daily.length);return <g key={r.date}>{(['favorites','cart'] as const).map((k,s)=>{const v=r[k];const bx=cx+(s?4:-4),width=Math.min(7,150/Math.max(1,daily.length));return <g key={k}><title>{r.date} · {k==='favorites'?'收藏':'加购'} {fmt(v,0)}</title>{v!=null&&Array.from({length:Math.ceil(v/unit)},(_,j)=>{const fraction=Math.min(1,v/unit-j);return <line key={j} x1={bx-width*fraction/2} x2={bx+width*fraction/2} y1={225-(j+.5)*4.7} y2={225-(j+.5)*4.7} stroke={s?C.HERO:C.DATA} strokeWidth="2"/>})}</g>})}{labelDays.has(i)&&<text x={cx} y="250" fontSize="10" textAnchor="middle" fill={C.MUT}>{r.date.slice(5)}</text>}</g>})}{[0,.5,1].map(t=><text key={t} x="40" y={225-t*164.5+3} textAnchor="end" fontSize="11" fill={C.MUT}>{fmt(engagementMax*t,0)}</text>)}</Svg>
    </Card>}
    {overview&&<Card title={overview?'营销场景构成':'当前维度贡献构成'} note="环上角度表示占比；红、绿及灰阶区分类目，不表示好坏 · 长尾合并为其他" source="分母为当前报表合计，不跨视图相加 · 下方列出精确比例" tools={<select aria-label="构成指标" value={composition} onChange={e=>setComposition(e.target.value as typeof composition)} className="rounded border-gray-200 text-xs"><option value="spend">花费构成</option><option value="revenue">成交构成</option></select>}>
      {complete?<><svg role="img" aria-label="贡献刻度环" viewBox="0 0 400 280" className="mx-auto w-full max-w-[380px]">{segments.map((seg,i)=>{const prior=segments.slice(0,i).reduce((s,v)=>s+v.value,0)/total!;const ratio=seg.value/total!;return <g key={seg.name} {...(seg.row?clickProps(seg.row,onSelect):{})} className={seg.row?'cursor-pointer':''}><title>{seg.name} · {fmt(seg.value)} · {fmt(ratio*100)}%</title>{Array.from({length:Math.ceil(ratio*100)},(_,k)=>{const a=(prior+Math.min(ratio,(k+.5)/100))*Math.PI*2-Math.PI/2;const [x1,y1]=pol(65,a),[x2,y2]=pol(90,a);return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.CAT[i]} strokeWidth="2"/>})}</g>})}<text x="200" y="140" textAnchor="middle" fontSize="24" fontWeight="700" fill={C.TXT}>{fmt(total)}</text><text x="200" y="162" textAnchor="middle" fontSize="12" fill={C.MUT}>{composition==='spend'?'报表花费':'归因成交'} · 元</text></svg><div className="grid gap-2 sm:grid-cols-2">{segments.map((s,i)=><div key={s.name} className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{background:C.CAT[i]}}/><span className="truncate" title={s.name}>{s.name}</span></span><span>{fmt(s.value/total!*100)}%</span></div>)}</div></>:<p className="py-20 text-center text-sm text-gray-500">合计为零或存在缺失值，暂不绘制占比</p>}
    </Card>}
    {!overview&&<Card title={`TOP${rankCount} · ${titles[metric]||'当前指标'}排名`} note="按所选指标降序 · 点击名称查看全屏详情 · 刻度长度与数值成比例" source={`当前搜索与榜单筛选下共${rows.length}项${top?`（TOP${top}限制）`:''}，此图展示${ranked.length}项`} tools={<select aria-label="图表TOP数量" value={rankCount} onChange={e=>setRankCount(Number(e.target.value))} className="rounded border-gray-200 text-xs"><option value="10">TOP10</option><option value="20">TOP20</option></select>}>
      <div className="max-h-[420px] overflow-y-auto"><Svg label="指标横向刻度排名" height={ranksHeight}>{ranked.map((r,i)=>{const v=r[metric],yy=25+i*34;return <g key={r.id} {...clickProps(r,onSelect)} className="cursor-pointer"><title>{r.name} · {titles[metric]||metric} {fmt(v)}</title><rect x="0" y={yy-16} width="520" height="32" fill="transparent"/><text x="5" y={yy+4} fontSize="12" fill={C.TXT}>{i+1}. {brief(r.name)}</text><line x1="185" x2="435" y1={yy+8} y2={yy+8} stroke={C.GRID}/>{Array.from({length:Math.ceil(num(v)/rankMax*50)},(_,j)=><line key={j} x1={187+j*5} x2={187+j*5} y1={yy-7} y2={yy+6} stroke={v!=null&&v>(benchmark[metric]??Infinity)?C.DATA:v!=null&&v<(benchmark[metric]??-Infinity)?C.HERO:C.MUT} strokeWidth="2"/>)}<text x="510" y={yy+4} textAnchor="end" fontSize="12" fontWeight="700" className={metricColor(metric,v,benchmark[metric])}>{fmt(v)}</text></g>})}</Svg></div>
    </Card>}
    {!overview&&<Card title="花费份额与成交份额对照" note="空心红点：花费占比 · 实心绿点：成交占比 · 两点距离显示份额差，不是利润" source="当前筛选中花费前8项 · 同一报表两种份额，不能相加">
      <Svg label="花费与成交份额哑铃对照" height={Math.max(180,shareRows.length*32+50)}>{shareRows.map((r,i)=>{const a=share(r.spend,ds.total.spend),b=share(r.revenue,ds.total.revenue),yy=25+i*32,xa=190+num(a)/shareMax*260,xb=190+num(b)/shareMax*260;return <g key={r.id} {...clickProps(r,onSelect)} className="cursor-pointer"><title>{r.name} · 花费占比 {fmt(a)}% · 成交占比 {fmt(b)}%</title><rect x="0" y={yy-15} width="520" height="30" fill="transparent"/><text x="5" y={yy+4} fontSize="12" fill={C.TXT}>{brief(r.name)}</text><line x1="190" x2="450" y1={yy} y2={yy} stroke={C.GRID}/>{a!=null&&b!=null&&<line x1={xa} x2={xb} y1={yy} y2={yy} stroke={C.MUT} strokeDasharray="2 3"/>}{a!=null&&<circle cx={xa} cy={yy} r="4" fill={C.BG} stroke={C.DATA} strokeWidth="2"/>}{b!=null&&<circle cx={xb} cy={yy} r="4" fill={C.HERO}/>}<text x="510" y={yy+4} textAnchor="end" fontSize="10" fill={C.MUT}>{fmt(a,1)}/{fmt(b,1)}%</text></g>})}</Svg>
    </Card>}
    {['overview','keywords','units','creatives'].includes(view)&&<Card title="直接与间接成交来源" note="红色：直接成交金额 · 绿色：间接成交金额 · 共用金额刻度，不叠加归因成交总额" source="当前筛选中成交前4项 · 仅展示官方报表已有分项，缺失不补零">
      <Svg label="直接间接成交堆叠刻度柱">{directRows.map((r,i)=>{const cx=80+i*120;let prior=0;return <g key={r.id} {...clickProps(r,onSelect)} className="cursor-pointer"><title>{r.name} · 直接成交 {fmt(r.directRevenue)} · 间接成交 {fmt(r.indirectRevenue)} · 总成交 {fmt(r.revenue)}</title>{(['directRevenue','indirectRevenue'] as const).map((k,s)=>{const v=r[k],base=225-prior/directMax*170;prior+=num(v);return <g key={k}>{v!=null&&Array.from({length:Math.ceil(v/directMax*40)},(_,j)=><line key={j} x1={cx-14} x2={cx+14} y1={base-(j+.5)*170/40} y2={base-(j+.5)*170/40} stroke={s?C.HERO:C.DATA} strokeWidth="2"/>)}<text x={cx+20} y={base-num(v)/directMax*85} fontSize="11" fill={s?C.HERO:C.DATA}>{fmt(v,0)}</text></g>})}<text x={cx} y="250" textAnchor="middle" fontSize="11" fill={C.MUT}>{brief(r.name).slice(0,8)}</text></g>})}<line x1="40" x2="490" y1="225" y2="225" stroke={C.GRID}/></Svg>
    </Card>}
  </div>
}
