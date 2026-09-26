"use client";

export default function GlobalError({
  reset,
}:{error:Error&{digest?:string};reset:()=>void}){
  return (
    <html lang="en">
      <body style={{margin:0,background:"#090909",color:"#f4f3ef",fontFamily:"Arial,sans-serif"}}>
        <main style={{minHeight:"100vh",display:"grid",placeContent:"center",justifyItems:"center",gap:16,padding:24,textAlign:"center"}}>
          <strong>3RD WORLD</strong>
          <h1 style={{fontSize:"clamp(52px,10vw,140px)",lineHeight:.82,letterSpacing:"-.07em",margin:"20px 0"}}>SYSTEM<br/>ERROR.</h1>
          <button onClick={reset} style={{border:0,borderBottom:"1px solid currentColor",background:"transparent",color:"inherit",padding:"0 0 4px",cursor:"pointer"}}>TRY AGAIN</button>
        </main>
      </body>
    </html>
  );
}
