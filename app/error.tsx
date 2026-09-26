"use client";

import {useEffect} from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{
    // Keep client diagnostics minimal; server logs retain the underlying error.
    console.error("3RD WORLD route error",error.digest??"no-digest");
  },[error]);

  return (
    <main className="not-found" role="alert">
      <span>3RD WORLD / SYSTEM</span>
      <h1>TRANSMISSION<br/>INTERRUPTED.</h1>
      <p className="muted">THE PAGE COULD NOT BE LOADED.</p>
      <button className="underlined-link error-reset" onClick={reset}>TRY AGAIN</button>
      <Link href="/" className="underlined-link">RETURN HOME</Link>
    </main>
  );
}
