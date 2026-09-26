"use client";

import {FormEvent,useState} from "react";

export function AdminInventoryAdjustForm({
  variantId,
  locationId,
  sku,
}:{variantId:string;locationId:string;sku:string}){
  const [open,setOpen]=useState(false);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/inventory/adjust",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        variantId,
        locationId,
        delta:Number(form.get("delta")??0),
        note:String(form.get("note")??""),
      }),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(data.error??"Unable to adjust inventory.");
      setLoading(false);
      return;
    }
    window.location.reload();
  }

  if(!open)return <button className="admin-row-action" onClick={()=>setOpen(true)}>ADJUST</button>;

  return (
    <form className="admin-inline-form" onSubmit={submit}>
      <span>{sku}</span>
      <input name="delta" type="number" step="1" placeholder="+ / -" required/>
      <input name="note" placeholder="NOTE"/>
      {error&&<small>{error}</small>}
      <button disabled={loading}>{loading?"…":"SAVE"}</button>
      <button type="button" onClick={()=>setOpen(false)}>CANCEL</button>
    </form>
  );
}
