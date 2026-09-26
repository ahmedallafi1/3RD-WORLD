"use client";

import {FormEvent,useState} from "react";

type SetupData={secret:string;uri:string;expiresAt:string};

export function AdminSecurityPanel({enabled}:{enabled:boolean}){
  const [setup,setSetup]=useState<SetupData|null>(null);
  const [recovery,setRecovery]=useState<string[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function start(){
    setBusy(true);
    setError("");
    const response=await fetch("/api/admin/mfa/setup",{method:"POST"});
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){
      setError(payload.error??"Unable to start MFA setup.");
      return;
    }
    setSetup(payload.data);
  }

  async function verify(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/mfa/verify",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({code:String(form.get("code")??"")}),
    });
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){
      setError(payload.error??"Unable to enable MFA.");
      return;
    }
    setRecovery(payload.data.recoveryCodes??[]);
    setSetup(null);
  }

  async function disable(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/mfa/disable",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({code:String(form.get("code")??"")}),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      setError(payload.error??"Unable to disable MFA.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if(recovery.length){
    return (
      <section className="admin-security-card">
        <span>MFA ENABLED</span>
        <h2>RECOVERY CODES</h2>
        <p>STORE THESE ONCE. EACH CODE WORKS ONE TIME.</p>
        <div className="admin-recovery-codes">{recovery.map(code=><code key={code}>{code}</code>)}</div>
        <button className="admin-submit" onClick={()=>window.location.reload()}>I SAVED THEM</button>
      </section>
    );
  }

  if(enabled){
    return (
      <section className="admin-security-card">
        <span>AUTHENTICATOR</span>
        <h2>2FA ACTIVE</h2>
        <p>ADMIN SIGN-IN REQUIRES YOUR AUTHENTICATOR CODE OR AN UNUSED RECOVERY CODE.</p>
        <form className="admin-security-inline" onSubmit={disable}>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-DIGIT CODE" required/>
          <button className="admin-row-action" disabled={busy}>{busy?"…":"DISABLE 2FA"}</button>
        </form>
        {error&&<p className="admin-form-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="admin-security-card">
      <span>AUTHENTICATOR</span>
      <h2>ENABLE 2FA</h2>
      <p>USE AN AUTHENTICATOR APP. THIS PROTECTS ADMIN EVEN IF A PASSWORD IS STOLEN.</p>
      {!setup?(
        <button className="admin-submit" onClick={()=>void start()} disabled={busy}>
          {busy?"PREPARING…":"START 2FA SETUP"}
        </button>
      ):(
        <>
          <div className="admin-mfa-secret">
            <span>MANUAL SECRET</span>
            <code>{setup.secret}</code>
            <small>ADD THIS AS A TOTP / AUTHENTICATOR ACCOUNT FOR 3RD WORLD.</small>
          </div>
          <details className="admin-mfa-uri"><summary>SHOW AUTHENTICATOR URI</summary><code>{setup.uri}</code></details>
          <form className="admin-security-inline" onSubmit={verify}>
            <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" placeholder="6-DIGIT CODE" required/>
            <button className="admin-row-action" disabled={busy}>{busy?"VERIFYING…":"VERIFY + ENABLE"}</button>
          </form>
        </>
      )}
      {error&&<p className="admin-form-error">{error}</p>}
    </section>
  );
}
