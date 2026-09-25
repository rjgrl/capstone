"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { facultyName } from "@/lib/constants";
import { Alert, Empty, PageHeader, Spinner } from "@/components/ui";
import { CsvTools } from "@/components/CsvTools";
import { FacultyForm } from "@/components/FacultyForm";

type Person = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  rank: string;
  mobileNumber: string;
  institutionalEmail: string;
  department: { id: string; name: string };
  program: { id: string; name: string } | null;
  _count: { projects: number };
};

type Options = {
  departments: { id: string; name: string }[];
  programs: { id: string; name: string; departmentId?: string }[];
};

const emptyForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  rank: "Faculty",
  departmentId: "",
  programId: "",
  contactInformation: "",
  mobileNumber: "",
  institutionalEmail: "",
  facebookAccount: "",
};

export default function FacultyPage() {
  const [faculty, setFaculty] = useState<Person[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", departmentId: "", programId: "", rank: "" });
  const [editing, setEditing] = useState<typeof emptyForm | null>(null);

  async function load(next = filters) {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => value && params.set(key, value));
    const result = await api<{ faculty: Person[] }>(`/api/faculty?${params.toString()}`);
    setFaculty(result.faculty);
  }

  useEffect(() => {
    Promise.all([
      api<{ faculty: Person[] }>("/api/faculty"),
      api<Options & { programs: { id: string; name: string; departmentId: string }[] }>("/api/options"),
      api<{ permissions: string[] }>("/api/auth/me"),
    ])
      .then(([rows, optionData, session]) => {
        setFaculty(rows.faculty);
        setOptions(optionData);
        setPermissions(session.permissions);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const canSearch = permissions.includes("search.researchers") || permissions.includes("faculty.manage");

  return (
    <div>
      <PageHeader
        title="Faculty / Professor"
        description="Search the roster and open a profile to see contact details and research projects."
        actions={permissions.includes("faculty.manage") ? <button className="btn-primary" onClick={() => setEditing(emptyForm)}>Add Faculty / Professor</button> : null}
      />
      {error ? <Alert>{error}</Alert> : null}
      {permissions.includes("csv.exchange") ? <CsvTools entity="faculty" canImport={permissions.includes("faculty.manage")} /> : null}
      {canSearch ? (
        <form className="card mb-4 grid gap-3 p-4 md:grid-cols-4" onSubmit={async (event) => { event.preventDefault(); try { await load(); } catch (err) { setError(err instanceof Error ? err.message : "Search failed."); } }}>
          <label className="field"><span className="label">Search</span><input className="input" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Name, email, or mobile number" /></label>
          <label className="field"><span className="label">Department</span><select className="select" value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}><option value="">All departments</option>{options?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <label className="field"><span className="label">Program</span><select className="select" value={filters.programId} onChange={(event) => setFilters({ ...filters, programId: event.target.value })}><option value="">All programs</option>{options?.programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
          <label className="field"><span className="label">Rank</span><select className="select" value={filters.rank} onChange={(event) => setFilters({ ...filters, rank: event.target.value })}><option value="">Faculty and Professor</option><option>Faculty</option><option>Professor</option></select></label>
          <button className="btn-primary" type="submit">Search</button>
        </form>
      ) : null}
      {loading ? <Spinner /> : faculty.length === 0 ? <Empty title="No faculty or professors found" body="Try another name, department, or program." /> : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Rank</th><th>Department</th><th>Program</th><th>Institutional Email</th><th>Mobile Number</th><th>Research Projects</th></tr></thead>
            <tbody>
              {faculty.map((person) => (
                <tr key={person.id}>
                  <td><Link className="font-semibold text-navy hover:underline" href={`/faculty/${person.id}`}>{facultyName(person)}</Link></td>
                  <td>{person.rank}</td>
                  <td>{person.department.name}</td>
                  <td>{person.program?.name ?? "—"}</td>
                  <td>{person.institutionalEmail}</td>
                  <td>{person.mobileNumber}</td>
                  <td>{person._count.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? <FacultyForm initial={editing} options={options} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} /> : null}
    </div>
  );
}
