"use client";

import {FormEvent,useState} from "react";

type DropOption={id:string;world:string;name:string};

export function AdminAccessGrantForm({drops}:{drops:DropOption[]}){
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const iso=(name:string)=>{
      const value=String(form.get(name)??"").trim();
      return value?new Date(value).toISOString():null;
    };

    const response=await fetch("/api/admin/access/grants",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        dropId:String(form.get("dropId")??""),
        email:String(form.get("email")??""),
        grantType:String(form.get("grantType")??"EARLY"),
        startsAt:iso("startsAt"),
        endsAt:iso("endsAt"),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to create grant.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <form className="admin-create-form" onSubmit={submit}>
      <div className="admin-create-head"><strong>DROP ACCESS GRANT</strong></div>
      <div className="admin-form-grid">
        <label>DROP<select name="dropId" required>{drops.map(drop=><option key={drop.id} value={drop.id}>{drop.world} / {drop.name}</option>)}</select></label>
        <label>EMAIL<input name="email" type="email" required/></label>
        <label>LEVEL<select name="grantType" defaultValue="EARLY"><option>EARLY</option><option>VIP</option><option>PRIVATE</option></select></label>
        <label>STARTS<input name="startsAt" type="datetime-local"/></label>
        <label>ENDS<input name="endsAt" type="datetime-local"/></label>
      </div>
      {error&&<p className="admin-form-error">{error}</p>}
      <button className="admin-submit" disabled={busy}>{busy?"GRANTING…":"GRANT ACCESS"}</button>
    </form>
  );
}

export function AdminPassportTierForm(){
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/access/passport-tier",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        email:String(form.get("email")??""),
        tier:String(form.get("tier")??"MEMBER"),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to set tier.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <form className="admin-create-form" onSubmit={submit}>
      <div className="admin-create-head"><strong>PASSPORT TIER</strong></div>
      <div className="admin-form-grid">
        <label>EMAIL<input name="email" type="email" required/></label>
        <label>TIER<select name="tier" defaultValue="EARLY"><option>MEMBER</option><option>EARLY</option><option>VIP</option></select></label>
      </div>
      {error&&<p className="admin-form-error">{error}</p>}
      <button className="admin-submit" disabled={busy}>{busy?"UPDATING…":"UPDATE PASSPORT"}</button>
    </form>
  );
}
