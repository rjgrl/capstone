"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Alert, PageHeader, Spinner } from "@/components/ui";

type Permission = { key: string; name: string; description: string; module: string };
type Role = { id: string; key: string; name: string; description: string; permissions: string[] };
type UserAccess = {
  id: string;
  name: string;
  email: string;
  roleName: string;
  roleKey: string;
  departmentName: string | null;
  rolePermissions: string[];
  overrides: { key: string; granted: boolean }[];
};

export default function AccessPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [userId, setUserId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api<{ permissions: Permission[]; roles: Role[]; users: UserAccess[] }>("/api/access")
      .then((result) => {
        setPermissions(result.permissions);
        setRoles(result.roles);
        setUsers(result.users);
        if (result.users[0]) {
          setUserId(result.users[0].id);
          setSelected(effective(result.users[0]));
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  const user = users.find((item) => item.id === userId);
  const modules = useMemo(() => {
    const grouped = new Map<string, Permission[]>();
    for (const permission of permissions) {
      grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission]);
    }
    return [...grouped.entries()];
  }, [permissions]);

  function choose(id: string) {
    const next = users.find((item) => item.id === id);
    setUserId(id);
    setSelected(next ? effective(next) : []);
    setNotice("");
  }

  async function save() {
    if (!user) return;
    setError("");
    setNotice("");
    const roleSet = new Set(user.rolePermissions);
    const chosen = new Set(selected);
    const granted = [...chosen].filter((key) => !roleSet.has(key));
    const revoked = [...roleSet].filter((key) => !chosen.has(key));
    try {
      await api(`/api/access/${user.id}`, { method: "PUT", body: JSON.stringify({ granted, revoked }) });
      const result = await api<{ permissions: Permission[]; roles: Role[]; users: UserAccess[] }>("/api/access");
      setUsers(result.users);
      const refreshed = result.users.find((item) => item.id === user.id);
      if (refreshed) setSelected(effective(refreshed));
      setNotice("User functions were updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  if (!roles.length && !error) return <Spinner />;

  return (
    <div>
      <PageHeader title="Roles and Access" description="The three roles keep their default functions. A Super Admin can assign a function to a user or remove it." />
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <section className="grid gap-4 lg:grid-cols-3">
        {roles.map((role) => (
          <article key={role.id} className="card p-4">
            <h2 className="font-serif text-xl text-navy">{role.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{role.description}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {role.permissions.map((key) => <li key={key}>{permissions.find((item) => item.key === key)?.name ?? key}</li>)}
            </ul>
          </article>
        ))}
      </section>
      <section className="card mt-6 p-5">
        <label className="field max-w-xl">
          <span className="label">User</span>
          <select className="select" value={userId} onChange={(event) => choose(event.target.value)}>
            {users.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.roleName}{item.departmentName ? ` · ${item.departmentName}` : ""}</option>)}
          </select>
        </label>
        {modules.map(([module, items]) => (
          <fieldset key={module} className="mb-4">
            <legend className="mb-2 font-semibold text-navy">{module}</legend>
            <div className="grid gap-2 md:grid-cols-2">
              {items.map((permission) => (
                <label key={permission.key} className="flex gap-2 rounded-md border border-line px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(permission.key)}
                    onChange={(event) => {
                      setSelected((current) => event.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key));
                    }}
                  />
                  <span>
                    <span className="font-semibold">{permission.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{permission.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button className="btn-primary" onClick={save} type="button">Save User Functions</button>
      </section>
    </div>
  );
}

function effective(user: UserAccess) {
  const keys = new Set(user.rolePermissions);
  for (const override of user.overrides) {
    if (override.granted) keys.add(override.key);
    else keys.delete(override.key);
  }
  return [...keys];
}
