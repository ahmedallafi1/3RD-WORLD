"use client";

import {FormEvent,useState} from "react";

export function AccessForm({compact=false}:{compact?:boolean}){
  const [email,setEmail]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!email.trim())return;
    setBusy(true);
    setError("");

    const response=await fetch("/api/access/join",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({email,source:compact?"homepage":"drop-page"}),
    });
    const payload=await response.json().catch(()=>({}));
    setBusy(false);

    if(!response.ok){
      setError(payload.error??"Unable to join.");
      return;
    }
    setSubmitted(true);
  }

  if(submitted){
    return <p className={compact?"form-success compact":"form-success"}>YOU&apos;RE ON THE LIST.</p>;
  }

  return (
    <>
      <form className={compact?"access-form":"drop-access-form"} onSubmit={submit}>
        <input
          type="email"
          required
          value={email}
          onChange={event=>setEmail(event.target.value)}
          placeholder="EMAIL ADDRESS"
          aria-label="Email address"
        />
        <button type="submit" disabled={busy}>{busy?"…":compact?"JOIN":"GET ACCESS"}</button>
      </form>
      {error&&<p className={compact?"form-success compact":"form-success"}>{error}</p>}
    </>
  );
}
