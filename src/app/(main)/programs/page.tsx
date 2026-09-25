"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, Modal, PageHeader, Spinner } from "@/components/ui";
import { CsvTools } from "@/components/CsvTools";

type Program = { id: string; name: string; departmentId: string; department: { name: string }; _count: { faculty: number; projects: number } };
type Department = { id: string; name: string };

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Program | "new" | null>(null);

  async function load() {
    const [programResult, departmentResult] = await Promise.all([
      api<{ programs: Program[] }>("/api/programs"),
      api<{ departments: Department[] }>("/api/departments"),
    ]);
    setPrograms(programResult.programs);
    setDepartments(departmentResult.departments);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <PageHeader title="Programs" description="Academic programs associated with departments and researchers." actions={<button className="btn-primary" onClick={() => setEditing("new")}>Add Program</button>} />
      {error ? <Alert>{error}</Alert> : null}
      <CsvTools entity="programs" canImport />
      {programs.length === 0 && !error ? <Spinner /> : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Program</th><th>Department</th><th>Faculty / Professor</th><th>Research Projects</th><th></th></tr></thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program.id}>
                  <td className="font-semibold">{program.name}</td>
                  <td>{program.department.name}</td>
                  <td>{program._count.faculty}</td>
                  <td>{program._count.projects}</td>
                  <td className="space-x-2">
                    <button className="btn-ghost" onClick={() => setEditing(program)}>Edit</button>
                    <button className="btn-ghost" onClick={async () => {
                      if (!window.confirm(`Delete ${program.name}?`)) return;
                      try { await api(`/api/programs/${program.id}`, { method: "DELETE" }); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Delete failed."); }
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? (
        <Modal title={editing === "new" ? "Add Program" : "Edit Program"} onClose={() => setEditing(null)}>
          <ProgramForm
            departments={departments}
            initial={editing === "new" ? null : editing}
            onSaved={async () => { setEditing(null); await load(); }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function ProgramForm({ departments, initial, onSaved }: { departments: Department[]; initial: Program | null; onSaved: () => Promise<void> }) {
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(initial ? `/api/programs/${initial.id}` : "/api/programs", {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify({ name: form.get("name"), departmentId: form.get("departmentId") }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }
  return (
    <form onSubmit={onSubmit}>
      {error ? <Alert>{error}</Alert> : null}
      <label className="field"><span className="label">Program name</span><input className="input" name="name" defaultValue={initial?.name} required /></label>
      <label className="field"><span className="label">Department</span><select className="select" name="departmentId" defaultValue={initial?.departmentId} required><option value="">Select a department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
      <button className="btn-primary" type="submit">Save</button>
    </form>
  );
}
