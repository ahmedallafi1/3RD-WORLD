"use client";

import Link from "next/link";
import {useState} from "react";

export function SavePieceButton({
  slug,
  signedIn,
  initialSaved,
}:{slug:string;signedIn:boolean;initialSaved:boolean}){
  const [saved,setSaved]=useState(initialSaved);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  if(!signedIn){
    return <Link href="/passport" className="save-piece-button">SIGN IN TO SAVE</Link>;
  }

  async function toggle(){
    setBusy(true);
    setError("");
    const next=!saved;
    const response=await fetch("/api/passport/saved/"+encodeURIComponent(slug),{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({saved:next}),
    });
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){
      setError(payload.error??"Unable to save.");
      return;
    }
    setSaved(next);
  }

  return (
    <div className="save-piece-wrap">
      <button className="save-piece-button" disabled={busy} onClick={()=>void toggle()}>
        {busy?"…":saved?"SAVED TO PASSPORT":"SAVE PIECE"}
      </button>
      {error&&<small>{error}</small>}
    </div>
  );
}
