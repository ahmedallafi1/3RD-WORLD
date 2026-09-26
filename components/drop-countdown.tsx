"use client";

import {useEffect,useMemo,useState} from "react";

function getRemaining(target:number){
  const total=Math.max(0,target-Date.now());
  return {
    days:Math.floor(total/86400000),
    hours:Math.floor((total/3600000)%24),
    minutes:Math.floor((total/60000)%60),
    seconds:Math.floor((total/1000)%60),
    done:total<=0
  };
}

export function DropCountdown(){
  const configured=process.env.NEXT_PUBLIC_DROP_AT;
  const target=useMemo(()=>configured?Date.parse(configured):NaN,[configured]);
  const [remaining,setRemaining]=useState(()=>Number.isFinite(target)?getRemaining(target):null);

  useEffect(()=>{
    if(!Number.isFinite(target))return;
    const update=()=>setRemaining(getRemaining(target));
    update();
    const timer=window.setInterval(update,1000);
    return ()=>window.clearInterval(timer);
  },[target]);

  if(!Number.isFinite(target)||!remaining){
    return <div className="drop-tba"><strong>DATE TO BE ANNOUNCED</strong><span>JOIN FOR FIRST ACCESS.</span></div>;
  }

  if(remaining.done){
    return <div className="drop-tba"><strong>WORLD OPEN.</strong><span>THE RELEASE IS LIVE.</span></div>;
  }

  const values=[remaining.days,remaining.hours,remaining.minutes,remaining.seconds];
  const labels=["DAYS","HRS","MIN","SEC"];

  return (
    <div className="countdown" aria-label="Drop countdown">
      {values.map((value,index)=>(
        <div className="countdown-unit" key={labels[index]}>
          <strong>{String(value).padStart(2,"0")}</strong>
          <small>{labels[index]}</small>
        </div>
      ))}
    </div>
  );
}
