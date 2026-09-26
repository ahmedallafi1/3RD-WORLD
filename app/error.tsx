"use client";

export default function ErrorPage({
  reset,
}:{error:Error&{digest?:string};reset:()=>void}){
  return (
    <main className="fatal-error-page">
      <span>3RD WORLD</span>
      <h1>SOMETHING BROKE.</h1>
      <p>THE REQUEST COULD NOT BE COMPLETED.</p>
      <button onClick={()=>reset()}>TRY AGAIN</button>
    </main>
  );
}
