"use client";

import {FormEvent,useState} from "react";

export function AccessForm({compact=false}:{compact?:boolean}){
  const [email,setEmail]=useState("");
  const [submitted,setSubmitted]=useState(false);

  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!email.trim())return;
    setSubmitted(true);
  }

  if(submitted){
    return <p className={compact?"form-success compact":"form-success"}>YOU'RE ON THE LIST.</p>;
  }

  return (
    <form className={compact?"access-form":"drop-access-form"} onSubmit={submit}>
      <input
        type="email"
        required
        value={email}
        onChange={event=>setEmail(event.target.value)}
        placeholder="EMAIL ADDRESS"
        aria-label="Email address"
      />
      <button type="submit">{compact?"JOIN":"GET ACCESS"}</button>
    </form>
  );
}
