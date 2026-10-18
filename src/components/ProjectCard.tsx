import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { projects } from '../content';
import stats from '../data/stats.json';
import scraped from '../data/scraped.json';
import { useReducedMotion } from '../lib/hooks';
import Sheet from './Sheet';
import { starMap } from '../lib/constellation';

type History={commits:number;daysActive:number};
type Scrape={themeColor?:string|null;captures?:{mobile?:string;desktop?:string}};
export default function ProjectCard({index,onClose,onChange,onVisit}:{index:number;onClose:()=>void;onChange:(i:number)=>void;onVisit:(id:string)=>void}){
  const project=projects[index];
  const data=(stats.projects as Record<string,History>)[project.id];
  const scrape=(scraped.projects as Record<string,Scrape>)[project.id];
  const accent=project.accent||scrape?.themeColor||'#D9B472';
  const reduced=useReducedMotion();
  const phone=useRef<HTMLButtonElement>(null);
  const wipe=useRef<HTMLDivElement>(null);
  const wipeTitle=useRef<HTMLParagraphElement>(null);
  const transition=useRef<gsap.core.Timeline>();
  const [leaving,setLeaving]=useState(false);
  const [imageFailed,setImageFailed]=useState(false);
  useEffect(()=>{setImageFailed(false);},[index]);
  useEffect(()=>()=>{transition.current?.kill();},[]);
  useEffect(()=>{
    const orient=(e:DeviceOrientationEvent)=>{if(!reduced)gsap.to(phone.current,{rotateX:Math.max(-5,Math.min(5,(e.beta||0)*.08)),rotateY:Math.max(-6,Math.min(6,(e.gamma||0)*.15)),duration:.4,ease:'power3.out'});};
    window.addEventListener('deviceorientation',orient);return()=>window.removeEventListener('deviceorientation',orient);
  },[reduced]);
  const enter=(button:HTMLElement)=>{
    if(leaving)return;
    onVisit(project.id);setLeaving(true);
    const rect=button.getBoundingClientRect();
    const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    const tl=gsap.timeline({onComplete:()=>{window.location.href=project.url;}});transition.current=tl;
    gsap.set(wipe.current,{display:'grid',backgroundColor:accent,color:project.id==='our_gallery'?'#FFF6E9':'#2A2233'});
    if(reduced)tl.fromTo(wipe.current,{opacity:0},{opacity:1,duration:.4}).to(wipeTitle.current,{opacity:1,duration:.2});
    else tl.fromTo(wipe.current,{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${Math.hypot(innerWidth,innerHeight)}px at ${x}px ${y}px)`,duration:1.05,ease:'expo.inOut'}).to(wipeTitle.current,{opacity:1,duration:.2},.65).to({},{duration:.3});
  };
  const date=new Intl.DateTimeFormat('en',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(project.started)).toUpperCase();
  return <><Sheet onClose={()=>{if(!leaving)onClose();}} titleId="project-title" className="project-sheet" accent={accent}>
    <div className="project-layout"><div className="project-preview"><button ref={phone} className="phone-frame" onClick={e=>enter(e.currentTarget)} aria-label={`Step inside ${project.title}`} disabled={leaving} onPointerMove={e=>{if(reduced)return;const rect=e.currentTarget.getBoundingClientRect();gsap.to(phone.current,{rotateY:(e.clientX-rect.left-rect.width/2)/rect.width*12,rotateX:-(e.clientY-rect.top-rect.height/2)/rect.height*10,duration:.35,ease:'power3.out'});}} onPointerLeave={()=>gsap.to(phone.current,{rotateX:0,rotateY:0,duration:.4,ease:'power3.out'})}>
      <span className="phone-camera" aria-hidden="true"/>{!imageFailed?<img src={`/previews/${project.id}-mobile.webp`} alt={`The opening screen of ${project.title}`} width="390" height="844" onError={()=>setImageFailed(true)}/>:<span className="preview-unavailable"><span aria-hidden="true">✦</span><em>{project.title}</em><small>a little world waiting for you</small></span>}
    </button><span className="preview-caption">a little window into this world ↗</span></div>
    <div className="project-copy"><p className="eyebrow">NO. {String(index+1).padStart(2,'0')} · {date}</p>{project.status==='draft'&&<span className="draft-badge">DRAFT · NEVER SENT</span>}<h2 id="project-title">{project.title}</h2><p className="project-subtitle">{project.subtitle}</p><div className="project-star-name" data-project-star={index}>✦ <StarName index={index}/></div><div className="project-note"><h3>Why I made it</h3><p>{project.note}</p></div>
      <ul className="stat-chips" aria-label="A few little details"><li>{data?.commits??0} {data?.commits===1?'commit':'commits'}</li><li>{(data?.daysActive??1)<=1?'made in a single day of love':`${data!.daysActive} days of love`}</li>{project.fact&&<li>{project.fact}</li>}</ul>
      {project.hint&&<p className="project-hint">{project.hint}</p>}
      <button className="step-inside" disabled={leaving} onClick={e=>enter(e.currentTarget)}>Step inside <span aria-hidden="true">→</span></button>
      <nav className="project-pagination" aria-label="Explore the timeline"><button disabled={index===0||leaving} onClick={()=>onChange(index-1)}>← Previous</button><span>{String(index+1).padStart(2,'0')} / 11</span><button disabled={index===projects.length-1||leaving} onClick={()=>onChange(index+1)}>Next star →</button></nav>
    </div></div>
  </Sheet><div className="exit-wipe" ref={wipe} aria-hidden="true"><p ref={wipeTitle}>{project.title}</p></div></>;
}
function StarName({index}:{index:number}){
  const star=starMap[index];
  return <>{star.name===star.designation?star.name:`${star.name} · ${star.designation}`}</>;
}
