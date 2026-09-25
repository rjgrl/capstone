"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, Modal, PageHeader, Spinner } from "@/components/ui";
import { CsvTools } from "@/components/CsvTools";

type UserRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  roleKey: string;
  departmentId: string | null;
  departmentName: string | null;
  facultyId: string | null;
  facultyName: string | null;
};

type Payload = {
  users: UserRow[];
  roles: { id: string; name: string; key: string }[];
  departments: { id: string; name: string }[];
  faculty: { id: string; firstName: string; lastName: string; institutionalEmail: string; userId: string | null }[];
};

export default function UsersPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);

  async function load() {
    setData(await api<Payload>("/api/users"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  if (!data && !error) return <Spinner />;

  return (
    <div>
      <PageHeader title="Users" description="Accounts for Super Admin, Department Head, and Researcher." actions={<button className="btn-primary" onClick={() => setEditing("new")}>Add User</button>} />
      {error ? <Alert>{error}</Alert> : null}
      <CsvTools entity="users" canImport />
      <div className="card table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Faculty / Professor</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data?.users.map((user) => (
              <tr key={user.id}>
                <td className="font-semibold">{user.name}</td>
                <td>{user.email}</td>
                <td>{user.roleName}</td>
                <td>{user.departmentName ?? "—"}</td>
                <td>{user.facultyName ?? "—"}</td>
                <td>{user.isActive ? "Active" : "Inactive"}</td>
                <td className="space-x-2">
                  <button className="btn-ghost" onClick={() => setEditing(user)}>Edit</button>
                  <button className="btn-ghost" onClick={async () => {
                    if (!window.confirm(`Delete ${user.name}?`)) return;
                    try { await api(`/api/users/${user.id}`, { method: "DELETE" }); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Delete failed."); }
                  }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && data ? (
        <UserForm
          payload={data}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      ) : null}
    </div>
  );
}

function UserForm({ payload, initial, onClose, onSaved }: { payload: Payload; initial: UserRow | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [error, setError] = useState("");
  const [roleId, setRoleId] = useState(initial?.roleId ?? payload.roles[0]?.id ?? "");
  const role = payload.roles.find((item) => item.id === roleId);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(initial ? `/api/users/${initial.id}` : "/api/users", {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password") || "",
          roleId,
          departmentId: form.get("departmentId") || "",
          facultyId: form.get("facultyId") || "",
          isActive: form.get("isActive") === "on",
        }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <Modal title={initial ? "Edit User" : "Add User"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <label className="field"><span className="label">Name</span><input className="input" name="name" defaultValue={initial?.name} required /></label>
        <label className="field"><span className="label">Email</span><input className="input" type="email" name="email" defaultValue={initial?.email} required /></label>
        <label className="field"><span className="label">{initial ? "New password" : "Password"}</span><input className="input" type="password" name="password" placeholder={initial ? "Leave blank to keep the current password" : ""} required={!initial} /></label>
        <label className="field"><span className="label">Role</span><select className="select" value={roleId} onChange={(event) => setRoleId(event.target.value)}>{payload.roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {role?.key === "DEPARTMENT_HEAD" ? (
          <label className="field"><span className="label">Department</span><select className="select" name="departmentId" defaultValue={initial?.departmentId ?? ""} required><option value="">Select a department</option>{payload.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        ) : null}
        {role?.key === "RESEARCHER" ? (
          <label className="field">
            <span className="label">Faculty / Professor</span>
            <select className="select" name="facultyId" defaultValue={initial?.facultyId ?? ""} required>
              <option value="">Select a profile</option>
              {payload.faculty.filter((person) => !person.userId || person.id === initial?.facultyId).map((person) => (
                <option key={person.id} value={person.id}>{person.lastName}, {person.firstName} · {person.institutionalEmail}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} /> Active account</label>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </Modal>
  );
}
