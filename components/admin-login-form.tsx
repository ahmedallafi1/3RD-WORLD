"use client";

import { FormEvent, useState } from "react";

export function AdminLoginForm() {
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [challengeToken,setChallengeToken]=useState("");

  async function submitPassword(event:FormEvent<HTMLFormElement>){
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
    if(payload.mfaRequired&&payload.challengeToken){
      setChallengeToken(payload.challengeToken);
      setLoading(false);
      return;
    }
    window.location.assign("/admin");
  }

  async function submitMfa(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/session/mfa",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        challengeToken,
        code:String(form.get("code")??""),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Authentication failed.");
      setLoading(false);
      return;
    }
    window.location.assign("/admin");
  }

  if(challengeToken){
    return (
      <form className="admin-login-form" onSubmit={submitMfa}>
        <label>
          AUTHENTICATOR / RECOVERY CODE
          <input
            name="code"
            autoComplete="one-time-code"
            inputMode="numeric"
            required
            autoFocus
          />
        </label>
        {error&&<p className="admin-form-error">{error}</p>}
        <button className="admin-submit" disabled={loading}>
          {loading?"VERIFYING…":"VERIFY"}
        </button>
        <button
          className="admin-login-back"
          type="button"
          onClick={()=>{setChallengeToken("");setError("");}}
        >
          BACK TO PASSWORD
        </button>
      </form>
    );
  }

  return (
    <form className="admin-login-form" onSubmit={submitPassword}>
      <label>EMAIL<input name="email" type="email" autoComplete="username" required/></label>
      <label>PASSWORD<input name="password" type="password" autoComplete="current-password" required/></label>
      {error&&<p className="admin-form-error">{error}</p>}
      <button className="admin-submit" disabled={loading}>{loading?"SIGNING IN…":"ENTER ADMIN"}</button>
    </form>
  );
}
