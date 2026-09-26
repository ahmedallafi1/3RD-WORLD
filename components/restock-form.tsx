"use client";

import {FormEvent,useState} from "react";

export function RestockForm({
  slug,
  defaultEmail="",
}:{slug:string;defaultEmail?:string}){
  const [email,setEmail]=useState(defaultEmail);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response=await fetch("/api/products/"+encodeURIComponent(slug)+"/restock",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({email}),
    });
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){
      setMessage(payload.error??"Unable to subscribe.");
      return;
    }
    setMessage("RESTOCK ACCESS SAVED.");
  }

  return (
    <form className="restock-form" onSubmit={submit}>
      <span>NOTIFY ME WHEN IT RETURNS</span>
      <div>
        <input
          type="email"
          value={email}
          onChange={event=>setEmail(event.target.value)}
          placeholder="EMAIL ADDRESS"
          required
        />
        <button disabled={busy}>{busy?"…":"NOTIFY ME"}</button>
      </div>
      {message&&<small>{message}</small>}
    </form>
  );
}
