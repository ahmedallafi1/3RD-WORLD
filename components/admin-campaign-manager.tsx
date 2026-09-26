"use client";

import {FormEvent,useState} from "react";

type WorldOption={id:string;code:string;title:string};

export function AdminCampaignCreateForm({worlds}:{worlds:WorldOption[]}){
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/campaigns",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        worldId:String(form.get("worldId")??""),
        type:String(form.get("type")??"EDITORIAL"),
        title:String(form.get("title")??""),
        slug:String(form.get("slug")??""),
        eyebrow:String(form.get("eyebrow")??"")||undefined,
        body:String(form.get("body")??"")||undefined,
        position:Number(form.get("position")??0),
        status:String(form.get("status")??"DRAFT"),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to create campaign.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <form className="admin-create-form" onSubmit={submit}>
      <div className="admin-create-head"><strong>NEW CAMPAIGN</strong></div>
      <div className="admin-form-grid">
        <label>WORLD<select name="worldId" required>{worlds.map(world=><option value={world.id} key={world.id}>{world.code} / {world.title}</option>)}</select></label>
        <label>TYPE<select name="type" defaultValue="EDITORIAL"><option>FILM</option><option>EDITORIAL</option><option>LOOKBOOK</option><option>STORY</option><option>SOUND</option></select></label>
        <label>STATUS<select name="status" defaultValue="DRAFT"><option>DRAFT</option><option>PUBLISHED</option></select></label>
        <label>TITLE<input name="title" required/></label>
        <label>SLUG<input name="slug" pattern="[a-z0-9-]+" required/></label>
        <label>POSITION<input name="position" type="number" defaultValue="0"/></label>
        <label className="admin-full">EYEBROW<input name="eyebrow"/></label>
        <label className="admin-full">BODY<textarea name="body" rows={5}/></label>
      </div>
      {error&&<p className="admin-form-error">{error}</p>}
      <button className="admin-submit" disabled={busy}>{busy?"CREATING…":"CREATE CAMPAIGN"}</button>
    </form>
  );
}

export function AdminCampaignStatusButton({
  id,
  status,
}:{id:string;status:"DRAFT"|"PUBLISHED"|"ARCHIVED"}){
  const [busy,setBusy]=useState(false);
  const next=status==="PUBLISHED"?"ARCHIVED":"PUBLISHED";

  async function change(){
    setBusy(true);
    const response=await fetch("/api/admin/campaigns/"+encodeURIComponent(id)+"/status",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({status:next}),
    });
    if(response.ok)window.location.reload();
    else setBusy(false);
  }

  return <button className="admin-row-action" disabled={busy} onClick={()=>void change()}>{busy?"…":next}</button>;
}
