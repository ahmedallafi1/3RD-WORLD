"use client";

import {FormEvent,useState} from "react";

type ProductOption={id:string;name:string;slug:string;worldCode:string|null};

export function AdminDropProductsForm({
  dropId,
  world,
  products,
  assigned,
}:{dropId:string;world:string;products:ProductOption[];assigned:string[]}){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const compatible=products.filter(product=>product.worldCode===world);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const productIds=form.getAll("productId").map(String);

    const response=await fetch("/api/admin/drops/"+encodeURIComponent(dropId)+"/products",{
      method:"PUT",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({productIds}),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to save pieces.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if(!open){
    return <button className="admin-row-action" onClick={()=>setOpen(true)}>PIECES ({assigned.length})</button>;
  }

  return (
    <form className="admin-drop-products" onSubmit={submit}>
      <strong>DROP PIECES</strong>
      {compatible.length?compatible.map(product=>(
        <label key={product.id}>
          <input
            type="checkbox"
            name="productId"
            value={product.id}
            defaultChecked={assigned.includes(product.id)}
          />
          <span>{product.name}<small>{product.slug}</small></span>
        </label>
      )):<small>NO PRODUCTS IN {world}</small>}
      {error&&<small className="admin-form-error">{error}</small>}
      <div>
        <button className="admin-row-action" disabled={busy}>{busy?"SAVING…":"SAVE"}</button>
        <button className="admin-row-action" type="button" onClick={()=>setOpen(false)}>CLOSE</button>
      </div>
    </form>
  );
}
