"use client";

import {FormEvent,useState} from "react";

export function AdminMarketEditor({
  market,
}:{
  market:{
    code:string;
    currency:string;
    freeShippingThresholdAmount:number|null;
    standardShippingAmount:number;
    dutiesMode:string;
  };
}){
  const [open,setOpen]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const freeRaw=String(form.get("free")??"").trim();
    const response=await fetch("/api/admin/markets/"+encodeURIComponent(market.code),{
      method:"PATCH",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        standardShippingAmount:Math.round(Number(form.get("standard")??0)*100),
        freeShippingThresholdAmount:freeRaw?Math.round(Number(freeRaw)*100):null,
        dutiesMode:String(form.get("dutiesMode")??market.dutiesMode),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to update market.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if(!open)return <button className="admin-row-action" onClick={()=>setOpen(true)}>EDIT</button>;

  return (
    <form className="admin-market-form" onSubmit={submit}>
      <label>STANDARD {market.currency}<input name="standard" type="number" step="0.01" min="0" defaultValue={(market.standardShippingAmount/100).toFixed(2)}/></label>
      <label>FREE OVER {market.currency}<input name="free" type="number" step="0.01" min="0" defaultValue={market.freeShippingThresholdAmount===null?"":(market.freeShippingThresholdAmount/100).toFixed(2)}/></label>
      <label>DUTIES<select name="dutiesMode" defaultValue={market.dutiesMode}><option value="UNPAID">UNPAID / DDU</option><option value="CALCULATED_AT_CHECKOUT">CALCULATE</option><option value="PAID">PAID / DDP</option></select></label>
      {error&&<small>{error}</small>}
      <div><button className="admin-row-action" disabled={busy}>{busy?"SAVING…":"SAVE"}</button><button className="admin-row-action" type="button" onClick={()=>setOpen(false)}>CANCEL</button></div>
    </form>
  );
}
