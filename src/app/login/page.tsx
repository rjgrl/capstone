"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Alert } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-navy px-8 py-10 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-2">Bukidnon State University</p>
          <h1 className="mt-6 max-w-md font-serif text-4xl leading-tight">Research and Development Unit</h1>
          <p className="mt-4 max-w-md text-sm text-slate-200">
             Research Management System
          </p>
        </div>
        <p className="text-xs text-slate-400">Super Admin · Department Head · Researcher</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h2 className="font-serif text-3xl text-navy">Sign In</h2>
          <p className="mb-6 mt-2 text-sm text-slate-600">Use your institutional account.</p>
          {error ? <Alert>{error}</Alert> : null}
          <label className="field">
            <span className="label">Institutional Email</span>
            <input className="input" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className="btn-primary w-full" disabled={pending} type="submit">
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </section>
    </div>
  );
}
