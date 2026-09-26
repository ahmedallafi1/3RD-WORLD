"use client";

import {FormEvent,useState} from "react";
import type {ContentPageSlug} from "@/lib/content/pages";

export function AdminContentEditor({
  slug,title,body,status,
}:{slug:ContentPageSlug;title:string;body:string;status:"DRAFT"|"PUBLISHED"}){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/content/"+encodeURIComponent(slug),{
      method:"PATCH",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        title:String(form.get("title")??""),
        body:String(form.get("body")??""),
        status:String(form.get("status")??"DRAFT"),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to update page.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if(!open)return <button className="admin-row-action" onClick={()=>setOpen(true)}>EDIT</button>;

  return (
    <form className="admin-content-editor" onSubmit={submit}>
      <label>TITLE<input name="title" defaultValue={title} maxLength={120} required/></label>
      <label>STATUS<select name="status" defaultValue={status}><option>DRAFT</option><option>PUBLISHED</option></select></label>
      <label>CONTENT<textarea name="body" defaultValue={body} rows={14} required={status==="PUBLISHED"}/></label>
      <small>USE BLANK LINES FOR PARAGRAPHS. START A HEADING WITH ##.</small>
      {error&&<p className="admin-form-error">{error}</p>}
      <div><button className="admin-submit" disabled={busy}>{busy?"SAVING…":"SAVE PAGE"}</button><button type="button" className="admin-row-action" onClick={()=>setOpen(false)}>CLOSE</button></div>
    </form>
  );
}
