"use client"
import {ReactNode,useEffect,useRef} from 'react'
import {createPortal} from 'react-dom'
import styles from './floatingPanel.module.css'
export default function TablePanel({full,close,children,label='全屏明细'}:{full:boolean;close:()=>void;children:ReactNode;label?:string}) {
  const ref=useRef<HTMLElement>(null)
  useEffect(()=>{
    if(!full)return
    const previous=document.activeElement as HTMLElement
    const overflow=document.body.style.overflow
    document.body.style.overflow='hidden';ref.current?.focus()
    const key=(e:KeyboardEvent)=>{
      if(label!=='项目详情'&&document.querySelector('[aria-label="项目详情"]'))return
      if(e.key==='Escape'){e.preventDefault();close()}
      if(e.key==='Tab'){
        const items=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, summary, [tabindex="0"]')||[]).filter(el=>el.getClientRects().length>0)
        if(!items.length)return
        if(e.shiftKey&&(document.activeElement===items[0]||document.activeElement===ref.current)){e.preventDefault();items[items.length-1].focus()}
        else if(!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0].focus()}
      }
    }
    document.addEventListener('keydown',key)
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);if(previous?.isConnected&&previous!==document.body)previous.focus();else document.querySelector<HTMLButtonElement>('[data-fullscreen-trigger]')?.focus()}
  },[full,close,label])
  const content=<section ref={ref} tabIndex={full?-1:undefined} role={full?'dialog':undefined} aria-modal={full?true:undefined} aria-label={full?label:undefined} className={full?`${styles.panel} flex flex-col gap-3 overflow-hidden bg-white p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-5`:'min-w-0 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950'}>{children}</section>
  return full?createPortal(<div className={`${styles.backdrop} z-50`} onClick={e=>{if(e.target===e.currentTarget)close()}}>{content}</div>,document.body):content
}
