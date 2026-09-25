"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, Modal, PageHeader, Spinner } from "@/components/ui";

type Item = { id: string; name: string; description: string | null; section: string | null; isRequired: boolean; requiresFile: boolean; sequence: number };
type Phase = { id: string; name: string; description: string; sequence: number; items: Item[] };
type Checklist = { id: string; name: string; description: string; type: string; phases: Phase[] };

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<
    | { kind: "phase"; checklistId: string; phase?: Phase }
    | { kind: "item"; phaseId: string; item?: Item }
    | null
  >(null);

  async function load() {
    const result = await api<{ checklists: Checklist[] }>("/api/checklists");
    setChecklists(result.checklists);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  if (!checklists.length && !error) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Documentary Checklists"
        description="Two processes are kept here: the Research Process Documentary Requirements Checklist, and the checklist for personally-funded research."
      />
      {error ? <Alert>{error}</Alert> : null}
      <div className="space-y-6">
        {checklists.map((checklist) => (
          <section key={checklist.id} className="card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl text-navy">{checklist.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{checklist.description}</p>
              </div>
              <button className="btn-secondary" onClick={() => setDialog({ kind: "phase", checklistId: checklist.id })}>Add Phase</button>
            </div>
            <ol className="mt-4 space-y-4">
              {checklist.phases.map((phase) => (
                <li key={phase.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phase {phase.sequence}</p>
                      <h3 className="font-serif text-xl text-navy">{phase.name}</h3>
                      <p className="text-sm text-slate-600">{phase.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => setDialog({ kind: "phase", checklistId: checklist.id, phase })}>Edit</button>
                      <button className="btn-ghost" onClick={async () => {
                        if (!window.confirm(`Delete phase ${phase.name}?`)) return;
                        try { await api(`/api/phases/${phase.id}`, { method: "DELETE" }); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Delete failed."); }
                      }}>Delete</button>
                      <button className="btn-secondary" onClick={() => setDialog({ kind: "item", phaseId: phase.id })}>Add Requirement</button>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {phase.items.map((item, index) => (
                      <li key={item.id}>
                        {item.section && item.section !== phase.items[index - 1]?.section ? (
                          <p className="mb-2 mt-3 text-sm font-semibold text-navy">{item.section}</p>
                        ) : null}
                        <div className="flex flex-col gap-2 rounded-md bg-paper px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold">{item.sequence}. {item.name}</p>
                            <p className="text-xs text-slate-500">{item.requiresFile ? (item.isRequired ? "Required" : "Optional") : "No file"}{item.description ? ` · ${item.description}` : ""}</p>
                          </div>
                          <div>
                            <button className="btn-ghost" onClick={() => setDialog({ kind: "item", phaseId: phase.id, item })}>Edit</button>
                            <button className="btn-ghost" onClick={async () => {
                              if (!window.confirm(`Delete ${item.name}?`)) return;
                              try { await api(`/api/checklist-items/${item.id}`, { method: "DELETE" }); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Delete failed."); }
                            }}>Delete</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {dialog?.kind === "phase" ? (
        <PhaseDialog
          phase={dialog.phase}
          onClose={() => setDialog(null)}
          onSubmit={async (body) => {
            await api(dialog.phase ? `/api/phases/${dialog.phase.id}` : `/api/checklists/${dialog.checklistId}/phases`, {
              method: dialog.phase ? "PATCH" : "POST",
              body: JSON.stringify(body),
            });
            setDialog(null);
            await load();
          }}
        />
      ) : null}
      {dialog?.kind === "item" ? (
        <ItemDialog
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSubmit={async (body) => {
            await api(dialog.item ? `/api/checklist-items/${dialog.item.id}` : `/api/phases/${dialog.phaseId}/items`, {
              method: dialog.item ? "PATCH" : "POST",
              body: JSON.stringify(body),
            });
            setDialog(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function PhaseDialog({ phase, onClose, onSubmit }: { phase?: Phase; onClose: () => void; onSubmit: (body: { name: string; description: string; sequence: number }) => Promise<void> }) {
  const [error, setError] = useState("");
  return (
    <Modal title={phase ? "Edit Phase" : "Add Phase"} onClose={onClose}>
      <form onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          await onSubmit({ name: String(form.get("name")), description: String(form.get("description")), sequence: Number(form.get("sequence")) });
        } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
      }}>
        {error ? <Alert>{error}</Alert> : null}
        <label className="field"><span className="label">Phase name</span><input className="input" name="name" defaultValue={phase?.name} required /></label>
        <label className="field"><span className="label">Phase description</span><textarea className="textarea" name="description" defaultValue={phase?.description} required /></label>
        <label className="field"><span className="label">Sequence</span><input className="input" name="sequence" type="number" min={1} defaultValue={phase?.sequence ?? 1} required /></label>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </Modal>
  );
}

function ItemDialog({ item, onClose, onSubmit }: { item?: Item; onClose: () => void; onSubmit: (body: { name: string; description: string; section: string; isRequired: boolean; requiresFile: boolean; sequence: number }) => Promise<void> }) {
  const [error, setError] = useState("");
  return (
    <Modal title={item ? "Edit Documentary Requirement" : "Add Documentary Requirement"} onClose={onClose}>
      <form onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          await onSubmit({
            name: String(form.get("name")),
            description: String(form.get("description") || ""),
            section: String(form.get("section") || ""),
            isRequired: form.get("isRequired") === "on",
            requiresFile: form.get("requiresFile") === "on",
            sequence: Number(form.get("sequence")),
          });
        } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
      }}>
        {error ? <Alert>{error}</Alert> : null}
        <label className="field"><span className="label">Checklist section</span><input className="input" name="section" defaultValue={item?.section ?? ""} /></label>
        <label className="field"><span className="label">Documentary requirement</span><input className="input" name="name" defaultValue={item?.name} required /></label>
        <label className="field"><span className="label">Description</span><textarea className="textarea" name="description" defaultValue={item?.description ?? ""} /></label>
        <label className="field"><span className="label">Sequence</span><input className="input" name="sequence" type="number" min={1} defaultValue={item?.sequence ?? 1} required /></label>
        <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" name="requiresFile" defaultChecked={item?.requiresFile ?? true} /> Researcher attaches a PDF for this line</label>
        <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" name="isRequired" defaultChecked={item?.isRequired ?? true} /> Required before the phase can be approved</label>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </Modal>
  );
}
