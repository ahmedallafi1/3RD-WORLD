"use client";

import {FormEvent,useState} from "react";

export function AdminDropCodeForm({dropId}:{dropId:string}){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [created,setCreated]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    setCreated("");
    const form=new FormData(event.currentTarget);
    const maxRaw=String(form.get("maxUses")??"").trim();
    const response=await fetch("/api/admin/drops/"+encodeURIComponent(dropId)+"/codes",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        label:String(form.get("label")??"")||undefined,
        code:String(form.get("code")??"")||undefined,
        maxUses:maxRaw?Number(maxRaw):null,
      }),
    });
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){
      setError(payload.error??"Unable to create code.");
      return;
    }
    setCreated(payload.data.code);
  }

  if(!open)return <button className="admin-row-action" onClick={()=>setOpen(true)}>ACCESS CODE</button>;

  return (
    <form className="admin-code-form" onSubmit={submit}>
      <input name="label" placeholder="LABEL"/>
      <input name="code" placeholder="CUSTOM OR AUTO"/>
      <input name="maxUses" type="number" min="1" placeholder="MAX USES"/>
      {created&&<strong className="admin-created-code">{created}</strong>}
      {error&&<small>{error}</small>}
      <div><button className="admin-row-action" disabled={busy}>{busy?"…":"CREATE"}</button><button className="admin-row-action" type="button" onClick={()=>setOpen(false)}>CLOSE</button></div>
    </form>
  );
}
