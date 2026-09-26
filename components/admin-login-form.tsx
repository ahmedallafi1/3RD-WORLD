"use client";

import { FormEvent, useState } from "react";

export function AdminLoginForm() {
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/session",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        email:String(form.get("email")??""),
        password:String(form.get("password")??""),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to sign in.");
      setLoading(false);
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>EMAIL<input name="email" type="email" autoComplete="username" required/></label>
      <label>PASSWORD<input name="password" type="password" autoComplete="current-password" required/></label>
      {error&&<p className="admin-form-error">{error}</p>}
      <button className="admin-submit" disabled={loading}>{loading?"SIGNING IN…":"ENTER ADMIN"}</button>
    </form>
  );
}
