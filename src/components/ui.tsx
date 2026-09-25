"use client";

import { STATUS_LABEL } from "@/lib/constants";
import { X } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl text-navy">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    info: "border-sky-200 bg-sky-50 text-sky-950",
  };
  return <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Badge({ value }: { value: string }) {
  const label = STATUS_LABEL[value] ?? value;
  const tones: Record<string, string> = {
    ONGOING: "bg-sky-100 text-sky-900",
    FINISHED: "bg-emerald-100 text-emerald-900",
    SUBMITTED: "bg-amber-100 text-amber-950",
    APPROVED: "bg-emerald-100 text-emerald-900",
    REVISION_REQUESTED: "bg-orange-100 text-orange-950",
    REJECTED: "bg-red-100 text-red-900",
    MISSING: "bg-slate-100 text-slate-700",
    SENT: "bg-emerald-100 text-emerald-900",
    LOGGED: "bg-amber-100 text-amber-950",
    FAILED: "bg-red-100 text-red-900",
    current: "bg-navy text-white",
    completed: "bg-emerald-100 text-emerald-900",
    pending: "bg-slate-100 text-slate-600",
  };
  const stateLabel: Record<string, string> = {
    current: "Current Phase",
    completed: "Completed",
    pending: "Pending",
  };
  return <span className={`badge ${tones[value] ?? "bg-slate-100 text-slate-700"}`}>{stateLabel[value] ?? label}</span>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <h2 className="font-serif text-xl text-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">{body}</p>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-3 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-serif text-xl text-navy">{title}</h2>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading…</div>
  );
}
