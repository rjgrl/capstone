"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { facultyName, formatDate, STATUS_LABEL } from "@/lib/constants";
import { Alert, Badge, Empty, PageHeader, Spinner } from "@/components/ui";

type Dashboard = {
  ongoing: number;
  finished: number;
  total: number;
  byYear: { year: number; ongoing: number; finished: number }[];
  byDepartment: { id: string; name: string; ongoing: number; finished: number; total: number }[];
  projects: {
    id: string;
    title: string;
    status: string;
    year: number;
    updatedAt: string;
    faculty: { firstName: string; middleName?: string | null; lastName: string };
    department: { name: string };
    currentPhase: { name: string } | null;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ dashboard: Dashboard }>("/api/dashboard")
      .then((result) => setData(result.dashboard))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  const maxDepartment = Math.max(1, ...data.byDepartment.map((department) => department.total));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Finished research, ongoing research, the yearly project report, and the number of research projects in each department."
      />
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="card p-5">
          <p className="text-sm font-semibold text-slate-500">Ongoing</p>
          <p className="mt-2 font-serif text-4xl text-navy">{data.ongoing}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm font-semibold text-slate-500">Finished</p>
          <p className="mt-2 font-serif text-4xl text-navy">{data.finished}</p>
        </article>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="font-serif text-2xl text-navy">Yearly Project Report</h2>
        {data.byYear.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No research projects have been recorded yet.</p>
        ) : (
          <div className="table-wrap mt-4">
            <table className="data-table min-w-0">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Ongoing</th>
                  <th>Finished</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byYear.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{row.ongoing}</td>
                    <td>{row.finished}</td>
                    <td>{row.ongoing + row.finished}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.byDepartment.length > 0 ? (
        <section className="card mt-6 p-5">
          <h2 className="font-serif text-2xl text-navy">Research Projects by Department</h2>
          <div className="mt-4 space-y-4">
            {data.byDepartment.map((department) => (
              <div key={department.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-navy">{department.name}</span>
                  <span className="text-slate-500">
                    {department.total} · {department.ongoing} ongoing · {department.finished} finished
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${(department.total / maxDepartment) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-3 font-serif text-2xl text-navy">Research Projects</h2>
        {data.projects.length === 0 ? (
          <Empty title="No research projects" body="Research projects appear here after a Researcher or Super Admin opens one." />
        ) : (
          <div className="card table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Research Project</th>
                  <th>Faculty / Professor</th>
                  <th>Department</th>
                  <th>Phase</th>
                  <th>Status</th>
                  <th>Year</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link className="font-semibold text-navy hover:underline" href={`/projects/${project.id}`}>
                        {project.title}
                      </Link>
                    </td>
                    <td>{facultyName(project.faculty)}</td>
                    <td>{project.department.name}</td>
                    <td>{project.currentPhase?.name ?? "—"}</td>
                    <td>
                      <Badge value={project.status} />
                    </td>
                    <td>{project.year}</td>
                    <td>{formatDate(project.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="sr-only">{STATUS_LABEL.ONGOING}</p>
      </section>
    </div>
  );
}
