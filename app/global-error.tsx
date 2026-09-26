"use client";

export default function GlobalError({
  reset,
}:{error:Error&{digest?:string};reset:()=>void}){
  return (
    <html lang="en">
      <body>
        <main className="fatal-error-page">
          <span>3RD WORLD</span>
          <h1>TRANSMISSION INTERRUPTED.</h1>
          <p>THE WORLD IS STILL HERE. RETRY THE CONNECTION.</p>
          <button onClick={()=>reset()}>TRY AGAIN</button>
        </main>
      </body>
    </html>
  );
}
