import type {Issue,Review} from './reviews'
export const hasIssueContent=(i:Issue)=>!!(i.problem.trim()||i.action.trim()||i.outcome.trim()||i.executedAt||i.followupDate)
export const hasReviewContent=(r:Review)=>!!(r.summary.trim()||r.issues.some(hasIssueContent))
export const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
export const isDue=(i:Issue,today=localDate())=>!i.archivedAt&&hasIssueContent(i)&&i.status==='done'&&!!i.followupDate&&i.followupDate<=today
