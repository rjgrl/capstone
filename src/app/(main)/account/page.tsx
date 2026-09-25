"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import { Alert, PageHeader } from "@/components/ui";

export default function AccountPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        }),
      });
      setNotice("Your password was changed.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The password could not be changed.");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Password" description="Change the password for the account you are using." />
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <form className="card p-5" onSubmit={onSubmit}>
        <label className="field"><span className="label">Current password</span><input className="input" type="password" name="currentPassword" required /></label>
        <label className="field"><span className="label">New password</span><input className="input" type="password" name="newPassword" required /></label>
        <p className="mb-4 text-xs text-slate-500">Use at least 8 characters, including a letter and a number.</p>
        <button className="btn-primary" type="submit">Change Password</button>
      </form>
    </div>
  );
}
