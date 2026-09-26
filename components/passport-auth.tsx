"use client";

import { FormEvent, useState } from "react";

export function PassportAuth() {
  const [mode,setMode]=useState<"login"|"register">("login");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const payload={
      email:String(form.get("email")??""),
      password:String(form.get("password")??""),
      firstName:String(form.get("firstName")??""),
      lastName:String(form.get("lastName")??""),
    };
    const response=await fetch(mode==="login"?"/api/auth/login":"/api/auth/register",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(payload),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(data.error??"Unable to continue.");
      setLoading(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="passport-auth">
      <div className="passport-auth-switch">
        <button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>SIGN IN</button>
        <button className={mode==="register"?"active":""} onClick={()=>setMode("register")}>CREATE PASSPORT</button>
      </div>
      <form onSubmit={submit}>
        {mode==="register"&&<>
          <input name="firstName" placeholder="FIRST NAME" autoComplete="given-name"/>
          <input name="lastName" placeholder="LAST NAME" autoComplete="family-name"/>
        </>}
        <input name="email" type="email" placeholder="EMAIL" autoComplete="email" required/>
        <input name="password" type="password" placeholder="PASSWORD" autoComplete={mode==="login"?"current-password":"new-password"} minLength={10} required/>
        {error&&<p>{error}</p>}
        <button className="primary-button" disabled={loading}>{loading?"PLEASE WAIT…":mode==="login"?"SIGN IN":"CREATE PASSPORT"}</button>
      </form>
    </div>
  );
}

export function PassportLogout(){
  async function logout(){
    await fetch("/api/auth/logout",{method:"POST"});
    window.location.reload();
  }
  return <button className="secondary-button" onClick={logout}>SIGN OUT</button>;
}
