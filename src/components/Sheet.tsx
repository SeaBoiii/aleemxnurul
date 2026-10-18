import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from '../lib/hooks';

export default function Sheet({children,titleId,onClose,className='',accent}:{children:ReactNode;titleId:string;onClose:()=>void;className?:string;accent?:string}){
  const backdrop=useRef<HTMLDivElement>(null);
  const panel=useRef<HTMLDivElement>(null);
  const startY=useRef<number|null>(null);
  const reduced=useReducedMotion();
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const node=panel.current!;
    const context=gsap.context(()=>{
      gsap.from(backdrop.current,{opacity:0,duration:.35,ease:'power3.out'});
      gsap.from(node,{opacity:0,...reduced?{}:{y:innerWidth<768?60:20},duration:.45,ease:'power3.out'});
    },backdrop);
    node.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const keydown=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();close.current();return;}
      if(e.key!=='Tab')return;
      const controls=Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,[tabindex="0"]')).filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls[controls.length-1];
      if(e.shiftKey&&(document.activeElement===first||!node.contains(document.activeElement))){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||!node.contains(document.activeElement))){e.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',keydown);
    return()=>{context.revert();document.removeEventListener('keydown',keydown);document.body.style.overflow=previousOverflow;previous?.focus({preventScroll:true});};
  },[reduced]);
  return <div className="sheet-backdrop" ref={backdrop} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className={`sheet ${className}`} ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} style={{'--project-accent':accent||'var(--champagne)'} as React.CSSProperties}>
    <div className="sheet-drag" aria-hidden="true" onPointerDown={e=>{startY.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(startY.current!==null&&!reduced)gsap.set(panel.current,{y:Math.max(0,e.clientY-startY.current)});}} onPointerUp={e=>{if(startY.current!==null&&e.clientY-startY.current>75)onClose();else gsap.to(panel.current,{y:0,duration:.25,ease:'power3.out'});startY.current=null;}} onPointerCancel={()=>{startY.current=null;gsap.set(panel.current,{y:0});}}><span/></div>
    <button className="sheet-close" aria-label="Close dialog" data-autofocus onClick={onClose}>×</button>{children}
  </div></div>;
}
