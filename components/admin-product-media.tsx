"use client";

import {FormEvent,useState} from "react";

type MediaItem={
  mediaId:string;
  kind:"IMAGE"|"VIDEO";
  storageKey:string;
  altText:string|null;
  role:"COVER"|"GALLERY"|"DETAIL"|"CAMPAIGN";
  position:number;
};

export function AdminProductMedia({
  productId,
  items,
}:{productId:string;items:MediaItem[]}){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function add(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/products/"+encodeURIComponent(productId)+"/media",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        kind:String(form.get("kind")??"IMAGE"),
        storageKey:String(form.get("storageKey")??""),
        altText:String(form.get("altText")??""),
        role:String(form.get("role")??"GALLERY"),
        position:Number(form.get("position")??0),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to add media.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  async function remove(mediaId:string){
    setBusy(true);
    setError("");
    const response=await fetch("/api/admin/products/"+encodeURIComponent(productId)+"/media",{
      method:"DELETE",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({mediaId}),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to remove media.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if(!open)return <button className="admin-row-action" onClick={()=>setOpen(true)}>MEDIA ({items.length})</button>;

  return (
    <div className="admin-media-manager">
      <div className="admin-media-head"><strong>PRODUCT MEDIA</strong><button onClick={()=>setOpen(false)}>CLOSE</button></div>
      {items.map(item=>(
        <div className="admin-media-row" key={item.mediaId}>
          <div><strong>{item.role} / {item.kind}</strong><small>{item.storageKey}</small></div>
          <button disabled={busy} onClick={()=>void remove(item.mediaId)}>REMOVE</button>
        </div>
      ))}
      <form onSubmit={add}>
        <label>TYPE<select name="kind" defaultValue="IMAGE"><option>IMAGE</option><option>VIDEO</option></select></label>
        <label>ROLE<select name="role" defaultValue={items.length?"GALLERY":"COVER"}><option>COVER</option><option>GALLERY</option><option>DETAIL</option><option>CAMPAIGN</option></select></label>
        <label>POSITION<input name="position" type="number" min="0" max="1000" defaultValue={items.length}/></label>
        <label className="admin-full">MEDIA URL / STORAGE KEY<input name="storageKey" required placeholder="https://cdn... or products/world-001/front.jpg"/></label>
        <label className="admin-full">ALT TEXT<input name="altText" maxLength={240} placeholder="Describe the product image"/></label>
        {error&&<p className="admin-form-error">{error}</p>}
        <button className="admin-submit" disabled={busy}>{busy?"SAVING…":"ADD MEDIA"}</button>
      </form>
    </div>
  );
}
