"use client";

import {useState} from "react";

export function AdminRefundButton({
  orderId,
  totalAmount,
  currency,
}:{orderId:string;totalAmount:number;currency:string}){
  const [open,setOpen]=useState(false);
  const [amount,setAmount]=useState((totalAmount/100).toFixed(2));
  const [reason,setReason]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(){
    const cents=Math.round(Number(amount)*100);
    if(!Number.isFinite(cents)||cents<=0){
      setError("Enter a valid refund amount.");
      return;
    }
    setBusy(true);
    setError("");
    const response=await fetch("/api/admin/orders/"+encodeURIComponent(orderId)+"/refund",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({amount:cents,reason}),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Refund failed.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if(!open)return <button className="admin-row-action" onClick={()=>setOpen(true)}>REFUND</button>;

  return (
    <div className="admin-refund-form">
      <label>AMOUNT ({currency})<input value={amount} onChange={event=>setAmount(event.target.value)} inputMode="decimal"/></label>
      <label>REASON<input value={reason} onChange={event=>setReason(event.target.value)} placeholder="OPTIONAL"/></label>
      {error&&<small>{error}</small>}
      <div>
        <button className="admin-row-action" disabled={busy} onClick={()=>void submit()}>{busy?"REFUNDING…":"CONFIRM"}</button>
        <button className="admin-row-action" disabled={busy} onClick={()=>setOpen(false)}>CANCEL</button>
      </div>
    </div>
  );
}
