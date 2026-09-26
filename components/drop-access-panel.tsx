"use client";

import {FormEvent,useState} from "react";

export function DropAccessPanel({
  slug,
  mode,
  waitlistEnabled,
  phase,
}:{slug:string;mode:"PUBLIC"|"EMAIL"|"CODE"|"PRIVATE";waitlistEnabled:boolean;phase:string}){
  const [email,setEmail]=useState("");
  const [code,setCode]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function join(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response=await fetch("/api/drops/"+encodeURIComponent(slug)+"/join",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({email}),
    });
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){
      setMessage(payload.error??"Unable to join.");
      return;
    }
    setMessage("YOU'RE ON THE LIST.");
  }

  async function enter(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response=await fetch("/api/drops/"+encodeURIComponent(slug)+"/access",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        email:email||undefined,
        code:code||undefined,
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setMessage(payload.error??"ACCESS DENIED.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  const canEnter=
    (phase==="LIVE"&&mode==="EMAIL") ||
    ((phase==="LIVE"||phase==="EARLY")&&(mode==="CODE"||mode==="PRIVATE"));
  const codeMode=mode==="CODE"||mode==="PRIVATE";

  return (
    <div className="drop-access-panel">
      {waitlistEnabled&&(
        <form className="drop-access-form" onSubmit={join}>
          <input
            type="email"
            value={email}
            onChange={event=>setEmail(event.target.value)}
            placeholder="EMAIL ADDRESS"
            aria-label="Email address"
            required
          />
          <button disabled={busy}>{busy?"…":"JOIN"}</button>
        </form>
      )}

      {canEnter&&(
        <form className="drop-code-form" onSubmit={enter}>
          {codeMode&&(
            <input
              value={code}
              onChange={event=>setCode(event.target.value.toUpperCase())}
              placeholder="ACCESS CODE"
              aria-label="Access code"
              required
            />
          )}
          {!codeMode&&(
            <input
              type="email"
              value={email}
              onChange={event=>setEmail(event.target.value)}
              placeholder="APPROVED EMAIL"
              aria-label="Approved email"
              required
            />
          )}
          <button disabled={busy}>{busy?"CHECKING…":"ENTER WORLD"}</button>
        </form>
      )}

      {mode==="PRIVATE"&&phase==="LIVE"&&(
        <p className="drop-private-note">PRIVATE ACCESS / PASSPORT OR INVITATION REQUIRED.</p>
      )}

      {message&&<p className="form-success compact">{message}</p>}
    </div>
  );
}
