"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import { Alert } from "@/components/ui";

export function CsvTools({ entity, canImport }: { entity: string; canImport: boolean }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ created: number }>(`/api/csv/${entity}`, { method: "POST", body: form });
      setMessage(`Imported ${result.created} row${result.created === 1 ? "" : "s"}.`);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  return (
    <div className="no-print card mb-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-navy">CSV</h2>
          <p className="text-xs text-slate-500">Export the current records, or import a CSV with the same columns.</p>
        </div>
        <a className="btn-secondary" href={`/api/csv/${entity}`}>
          Export CSV
        </a>
      </div>
      {canImport ? (
        <form className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={onImport}>
          <input className="input" type="file" name="file" accept=".csv,text/csv" required />
          <button className="btn-primary" type="submit">
            Import CSV
          </button>
        </form>
      ) : null}
      {message ? <p className="mt-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
