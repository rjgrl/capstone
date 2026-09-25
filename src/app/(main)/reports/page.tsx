"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { facultyName, STATUS_LABEL } from "@/lib/constants";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";

type Report = {
  ongoing: number;
  finished: number;
  byYear: { year: number; ongoing: number; finished: number }[];
  byDepartment: { id: string; name: string; ongoing: number; finished: number; total: number }[];
  years: number[];
  projects: {
    id: string;
    title: string;
    status: string;
    year: number;
    faculty: { firstName: string; middleName?: string | null; lastName: string };
    department: { name: string };
    program: { name: string } | null;
    currentPhase: { name: string } | null;
    checklist: { name: string };
  }[];
};

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [year, setYear] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState("");

  async function load(nextYear = year, nextDepartment = departmentId) {
    const params = new URLSearchParams();
    if (nextYear) params.set("year", nextYear);
    if (nextDepartment) params.set("departmentId", nextDepartment);
    const result = await api<{ report: Report }>(`/api/reports?${params.toString()}`);
    setReport(result.report);
  }

  useEffect(() => {
    Promise.all([api<{ report: Report }>("/api/reports"), api<{ departments: { id: string; name: string }[] }>("/api/options")])
      .then(([result, options]) => {
        setReport(result.report);
        setDepartments(options.departments);
      })
      .catch((err) => setError(err.message));
  }, []);

  function exportVisible() {
    if (!report) return;
    const rows = [
      ["Title", "Faculty / Professor", "Department", "Program", "Checklist", "Phase", "Status", "Year"],
      ...report.projects.map((project) => [
        project.title,
        facultyName(project.faculty),
        project.department.name,
        project.program?.name ?? "",
        project.checklist.name,
        project.currentPhase?.name ?? "",
        STATUS_LABEL[project.status] ?? project.status,
        String(project.year),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => /[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "yearly-project-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!report && !error) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Yearly project report and the number of research projects by department."
        actions={
          <>
            <button className="btn-secondary no-print" onClick={exportVisible}>Export Report CSV</button>
            <button className="btn-primary no-print" onClick={() => window.print()}>Print Report</button>
          </>
        }
      />
      {error ? <Alert>{error}</Alert> : null}
      <form className="no-print card mb-4 grid gap-3 p-4 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); load().catch((err) => setError(err.message)); }}>
        <label className="field"><span className="label">Year</span><select className="select" value={year} onChange={(event) => setYear(event.target.value)}><option value="">All years</option>{report?.years.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="field"><span className="label">Department</span><select className="select" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">All visible departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        <div className="flex items-end"><button className="btn-primary" type="submit">Generate Report</button></div>
      </form>
      {report ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <article className="card p-5"><p className="text-sm text-slate-500">Ongoing</p><p className="font-serif text-4xl text-navy">{report.ongoing}</p></article>
            <article className="card p-5"><p className="text-sm text-slate-500">Finished</p><p className="font-serif text-4xl text-navy">{report.finished}</p></article>
          </section>
          <section className="card mt-4 p-5">
            <h2 className="font-serif text-2xl text-navy">By department</h2>
            <div className="table-wrap mt-3">
              <table className="data-table min-w-0">
                <thead><tr><th>Department</th><th>Ongoing</th><th>Finished</th><th>Total</th></tr></thead>
                <tbody>{report.byDepartment.map((department) => <tr key={department.id}><td>{department.name}</td><td>{department.ongoing}</td><td>{department.finished}</td><td>{department.total}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <section className="card mt-4 table-wrap">
            <table className="data-table">
              <thead><tr><th>Research Project</th><th>Faculty / Professor</th><th>Department</th><th>Phase</th><th>Status</th><th>Year</th></tr></thead>
              <tbody>
                {report.projects.map((project) => (
                  <tr key={project.id}>
                    <td><Link className="font-semibold text-navy hover:underline" href={`/projects/${project.id}`}>{project.title}</Link></td>
                    <td>{facultyName(project.faculty)}</td>
                    <td>{project.department.name}</td>
                    <td>{project.currentPhase?.name ?? "—"}</td>
                    <td><Badge value={project.status} /></td>
                    <td>{project.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
