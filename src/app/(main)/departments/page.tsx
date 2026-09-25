"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, Modal, PageHeader, Spinner } from "@/components/ui";
import { CsvTools } from "@/components/CsvTools";

type Department = { id: string; name: string; code: string; _count: { programs: number; faculty: number; projects: number; users: number } };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Department | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const result = await api<{ departments: Department[] }>("/api/departments");
    setDepartments(result.departments);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <PageHeader title="Departments" description="College departments that own researchers and research projects." actions={<button className="btn-primary" onClick={() => setCreating(true)}>Add Department</button>} />
      {error ? <Alert>{error}</Alert> : null}
      <CsvTools entity="departments" canImport />
      {departments.length === 0 && !error ? <Spinner /> : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Department</th><th>Code</th><th>Programs</th><th>Faculty / Professor</th><th>Research Projects</th><th>Department Heads</th><th></th></tr></thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td className="font-semibold">{department.name}</td>
                  <td>{department.code}</td>
                  <td>{department._count.programs}</td>
                  <td>{department._count.faculty}</td>
                  <td>{department._count.projects}</td>
                  <td>{department._count.users}</td>
                  <td className="space-x-2">
                    <button className="btn-ghost" onClick={() => setEditing(department)}>Edit</button>
                    <button className="btn-ghost" onClick={async () => {
                      if (!window.confirm(`Delete ${department.name}?`)) return;
                      try { await api(`/api/departments/${department.id}`, { method: "DELETE" }); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Delete failed."); }
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating || editing ? (
        <DepartmentForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await load(); }}
        />
      ) : null}
    </div>
  );
}

function DepartmentForm({ initial, onClose, onSaved }: { initial: Department | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(initial ? `/api/departments/${initial.id}` : "/api/departments", {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify({ name: form.get("name"), code: form.get("code") }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }
  return (
    <Modal title={initial ? "Edit Department" : "Add Department"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <label className="field"><span className="label">Department name</span><input className="input" name="name" defaultValue={initial?.name} required /></label>
        <label className="field"><span className="label">Code</span><input className="input" name="code" defaultValue={initial?.code} required /></label>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </Modal>
  );
}
