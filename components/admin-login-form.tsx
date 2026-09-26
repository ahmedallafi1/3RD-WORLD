"use client";

import { FormEvent, useState } from "react";

export function AdminLoginForm() {
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [needsCode,setNeedsCode]=useState(false);
  const [credentials,setCredentials]=useState<{email:string;password:string}|null>(null);

  async function authenticate(payload:{email:string;password:string;code?:string}){
    const response=await fetch("/api/admin/session",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(payload),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      if(data.code==="TWO_FACTOR_REQUIRED"){
        setCredentials({email:payload.email,password:payload.password});
        setNeedsCode(true);
        setError("");
        return;
      }
      setError(data.error??"Unable to sign in.");
      setLoading(false);
      return;
    }
    window.location.assign("/admin");
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    setError("");
    const form=new FormData(event.currentTarget);

    if(needsCode&&credentials){
      await authenticate({
        ...credentials,
        code:String(form.get("code")??""),
      });
      return;
    }

    await authenticate({
      email:String(form.get("email")??""),
      password:String(form.get("password")??""),
    });
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      {!needsCode?<>
        <label>EMAIL<input name="email" type="email" autoComplete="username" required/></label>
        <label>PASSWORD<input name="password" type="password" autoComplete="current-password" required/></label>
      </>:<>
        <p>ENTER YOUR 6-DIGIT ADMIN AUTHENTICATOR CODE.</p>
        <label>AUTHENTICATOR CODE<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus/></label>
      </>}
      {error&&<p className="admin-form-error">{error}</p>}
      <button className="admin-submit" disabled={loading}>
        {loading?"VERIFYING…":needsCode?"VERIFY CODE":"ENTER ADMIN"}
      </button>
    </form>
  );
}
