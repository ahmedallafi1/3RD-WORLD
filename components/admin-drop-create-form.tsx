"use client";

import {FormEvent,useState} from "react";

type WorldOption={id:string;code:string;title:string};

export function AdminDropCreateForm({worlds}:{worlds:WorldOption[]}){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const iso=(name:string)=>{
      const value=String(form.get(name)??"").trim();
      return value?new Date(value).toISOString():null;
    };
    const response=await fetch("/api/admin/drops",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        worldId:String(form.get("worldId")??""),
        name:String(form.get("name")??""),
        slug:String(form.get("slug")??""),
        status:String(form.get("status")??"DRAFT"),
        accessMode:String(form.get("accessMode")??"PUBLIC"),
        earlyAccessAt:iso("earlyAccessAt"),
        opensAt:iso("opensAt"),
        closesAt:iso("closesAt"),
        headline:String(form.get("headline")??"")||null,
        subheadline:String(form.get("subheadline")??"")||null,
        waitlistEnabled:form.get("waitlistEnabled")==="on",
        perVariantLimit:Number(form.get("perVariantLimit")??2),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to create drop.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if(!open)return <button className="admin-create-toggle" onClick={()=>setOpen(true)}>+ NEW DROP</button>;

  return (
    <form className="admin-create-form" onSubmit={submit}>
      <div className="admin-create-head"><strong>NEW DROP</strong><button type="button" onClick={()=>setOpen(false)}>CLOSE</button></div>
      <div className="admin-form-grid">
        <label>WORLD<select name="worldId" required>{worlds.map(world=><option key={world.id} value={world.id}>{world.code} / {world.title}</option>)}</select></label>
        <label>NAME<input name="name" placeholder="DROP 002" required/></label>
        <label>SLUG<input name="slug" placeholder="002" pattern="[a-z0-9-]+" required/></label>
        <label>STATUS<select name="status" defaultValue="DRAFT"><option>DRAFT</option><option>SCHEDULED</option><option>LIVE</option><option>CLOSED</option></select></label>
        <label>ACCESS<select name="accessMode" defaultValue="EMAIL"><option>PUBLIC</option><option>EMAIL</option><option>CODE</option><option>PRIVATE</option></select></label>
        <label>MAX / VARIANT<input name="perVariantLimit" type="number" min="1" defaultValue="2"/></label>
        <label>EARLY ACCESS<input name="earlyAccessAt" type="datetime-local"/></label>
        <label>PUBLIC OPEN<input name="opensAt" type="datetime-local"/></label>
        <label>CLOSE<input name="closesAt" type="datetime-local"/></label>
        <label className="admin-full">HEADLINE<input name="headline" placeholder="WORLD 002"/></label>
        <label className="admin-full">SUBHEADLINE<input name="subheadline" placeholder="FIRST ACCESS"/></label>
        <label className="admin-checkbox"><input name="waitlistEnabled" type="checkbox" defaultChecked/> WAITLIST ENABLED</label>
      </div>
      {error&&<p className="admin-form-error">{error}</p>}
      <button className="admin-submit" disabled={busy}>{busy?"CREATING…":"CREATE DROP"}</button>
    </form>
  );
}
