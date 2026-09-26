"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const target = new Date("2026-10-30T20:00:00-04:00").getTime();

function getRemaining() {
  const diff = Math.max(0, target - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

export default function AccessPage() {
  const [remaining, setRemaining] = useState(getRemaining);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemaining()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const values = useMemo(
    () => [remaining.d, remaining.h, remaining.m, remaining.s].map((value) => String(value).padStart(2, "0")),
    [remaining],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="access-page">
      <div className="access-globe" aria-hidden="true">◎</div>
      <div className="access-copy">
        <p>WORLD 002</p>
        <h1>ACCESS OPENS SOON.</h1>
        <p>30.10.26 / 20:00 NEW YORK</p>
      </div>

      <div className="countdown" aria-label="Drop countdown">
        {values.map((value, index) => (
          <div key={index}><strong>{value}</strong><span>{["DAYS", "HRS", "MIN", "SEC"][index]}</span></div>
        ))}
      </div>

      <form className="access-form access-form--dark" onSubmit={submit}>
        <label className="sr-only" htmlFor="drop-email">Email</label>
        <input id="drop-email" type="email" required placeholder="EMAIL ADDRESS" />
        <button type="submit">{submitted ? "YOU'RE IN" : "GET ACCESS"}</button>
      </form>

      <div className="access-bottom"><span>3RD WORLD</span><span>INSTAGRAM</span></div>
    </main>
  );
}
