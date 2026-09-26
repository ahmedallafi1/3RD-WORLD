"use client";

import { FormEvent, useState } from "react";

export function AdminProductCreateForm(){
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form=new FormData(event.currentTarget);
    const size=String(form.get("size")??"M").toUpperCase();
    const color=String(form.get("color")??"BLACK").toUpperCase();
    const price=Math.round(Number(form.get("price")??0)*100);
    const slug=String(form.get("slug")??"").trim().toLowerCase();
    const response=await fetch("/api/admin/products",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        name:String(form.get("name")??""),
        slug,
        category:String(form.get("category")??"TOPS"),
        description:String(form.get("description")??""),
        status:"DRAFT",
        variants:[{
          sku:String(form.get("sku")??slug+"-"+size).toUpperCase(),
          title:size,
          size,
          color,
          priceAmount:price,
          currency:"USD",
        }],
      }),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      setMessage(data.error??"Unable to create product.");
      setLoading(false);
      return;
    }
    window.location.reload();
  }

  if(!open)return <button className="admin-create-toggle" onClick={()=>setOpen(true)}>+ NEW PRODUCT</button>;

  return (
    <form className="admin-create-form" onSubmit={submit}>
      <div className="admin-create-head">
        <strong>NEW PRODUCT</strong>
        <button type="button" onClick={()=>setOpen(false)}>CLOSE</button>
      </div>
      <div className="admin-form-grid">
        <label>NAME<input name="name" required/></label>
        <label>SLUG<input name="slug" required pattern="[a-z0-9-]+"/></label>
        <label>CATEGORY<select name="category" defaultValue="TOPS"><option>TOPS</option><option>OUTERWEAR</option><option>BOTTOMS</option><option>ACCESSORIES</option></select></label>
        <label>COLOR<input name="color" defaultValue="BLACK" required/></label>
        <label>SIZE<input name="size" defaultValue="M" required/></label>
        <label>PRICE USD<input name="price" type="number" step="0.01" min="0" required/></label>
        <label>SKU<input name="sku" placeholder="AUTO IF BLANK"/></label>
        <label className="admin-full">DESCRIPTION<textarea name="description" rows={3}/></label>
      </div>
      {message&&<p className="admin-form-error">{message}</p>}
      <button className="admin-submit" disabled={loading}>{loading?"CREATING…":"CREATE DRAFT"}</button>
    </form>
  );
}
