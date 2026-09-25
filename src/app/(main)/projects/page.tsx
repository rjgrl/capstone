"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { CHECKLIST_TYPE, DOCUMENT_STATUS, PROJECT_STATUS, facultyName } from "@/lib/constants";
import { Alert, Badge, Empty, PageHeader, Spinner } from "@/components/ui";
import { CsvTools } from "@/components/CsvTools";

type Options = {
  departments: { id: string; name: string }[];
  programs: { id: string; name: string }[];
  faculty: { id: string; firstName: string; lastName: string }[];
  phases: { id: string; name: string; checklist: { name: string } }[];
  checklists: { type: string; name: string }[];
};

type Project = {
  id: string;
  title: string;
  status: string;
  year: number;
  currentPhaseComplete: boolean;
  missingCount: number;
  faculty: { firstName: string; middleName?: string | null; lastName: string };
  department: { name: string };
  program: { name: string } | null;
  checklist: { name: string; type: string };
  currentPhase: { name: string } | null;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleKey, setRoleKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    departmentId: "",
    programId: "",
    facultyId: "",
    status: "",
    phaseId: "",
    year: "",
    checklistType: "",
    reviewStatus: "",
  });

  async function load(next = filters) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    try {
      const result = await api<{ projects: Project[] }>(`/api/projects?${params.toString()}`);
      setProjects(result.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      api<Options>("/api/options"),
      api<{ permissions: string[]; user: { roleKey: string } }>("/api/auth/me"),
      api<{ projects: Project[] }>("/api/projects"),
    ])
      .then(([optionData, session, result]) => {
        setOptions(optionData);
        setPermissions(session.permissions);
        setRoleKey(session.user.roleKey);
        setProjects(result.projects);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const blocked = roleKey === "RESEARCHER" && projects.some((project) => project.status === PROJECT_STATUS.ONGOING && !project.currentPhaseComplete);
  const canCreate = permissions.includes("projects.create");
  const canSearch = permissions.includes("search.projects") || permissions.includes("projects.view");

  return (
    <div>
      <PageHeader
        title="Research Projects"
        description="Each study is Ongoing or Finished and moves through the phases of its documentary checklist."
        actions={
          canCreate ? (
            <Link className={`btn-primary ${blocked ? "pointer-events-none opacity-50" : ""}`} href={blocked ? "#" : "/projects/new"} aria-disabled={blocked}>
              New Research Project
            </Link>
          ) : null
        }
      />
      {blocked && canCreate ? (
        <Alert tone="info">
          A new Research Project cannot be started while a current phase is still incomplete. Supply the missing documents and wait for the Department Head to approve that phase.
        </Alert>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      {permissions.includes("csv.exchange") ? <CsvTools entity="projects" canImport={permissions.includes("users.manage")} /> : null}
      {canSearch ? (
        <form
          className="card mb-4 grid gap-3 p-4 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            load();
          }}
        >
          <label className="field">
            <span className="label">Search</span>
            <input className="input" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Title or faculty name" />
          </label>
          <label className="field">
            <span className="label">Department</span>
            <select className="select" value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}>
              <option value="">All departments</option>
              {options?.departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Program</span>
            <select className="select" value={filters.programId} onChange={(event) => setFilters({ ...filters, programId: event.target.value })}>
              <option value="">All programs</option>
              {options?.programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Faculty / Professor</span>
            <select className="select" value={filters.facultyId} onChange={(event) => setFilters({ ...filters, facultyId: event.target.value })}>
              <option value="">All faculty</option>
              {options?.faculty.map((person) => (
                <option key={person.id} value={person.id}>{person.lastName}, {person.firstName}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Status</span>
            <select className="select" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Ongoing and Finished</option>
              <option value={PROJECT_STATUS.ONGOING}>Ongoing</option>
              <option value={PROJECT_STATUS.FINISHED}>Finished</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Phase</span>
            <select className="select" value={filters.phaseId} onChange={(event) => setFilters({ ...filters, phaseId: event.target.value })}>
              <option value="">All phases</option>
              {options?.phases.map((phase) => (
                <option key={phase.id} value={phase.id}>{phase.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Year</span>
            <input className="input" inputMode="numeric" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} placeholder="2026" />
          </label>
          <label className="field">
            <span className="label">Documentary Checklist</span>
            <select className="select" value={filters.checklistType} onChange={(event) => setFilters({ ...filters, checklistType: event.target.value })}>
              <option value="">Both checklists</option>
              <option value={CHECKLIST_TYPE.STANDARD}>Research Process Documentary Requirements Checklist</option>
              <option value={CHECKLIST_TYPE.PERSONALLY_FUNDED}>Research Process Documentary Requirements Checklist for Personally Funded Research</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Review Status</span>
            <select className="select" value={filters.reviewStatus} onChange={(event) => setFilters({ ...filters, reviewStatus: event.target.value })}>
              <option value="">Any review status</option>
              <option value={DOCUMENT_STATUS.SUBMITTED}>Submitted</option>
              <option value={DOCUMENT_STATUS.APPROVED}>Approved</option>
              <option value={DOCUMENT_STATUS.REVISION_REQUESTED}>Revision Requested</option>
              <option value={DOCUMENT_STATUS.REJECTED}>Rejected</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className="btn-primary" type="submit">Search</button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                const cleared = { q: "", departmentId: "", programId: "", facultyId: "", status: "", phaseId: "", year: "", checklistType: "", reviewStatus: "" };
                setFilters(cleared);
                load(cleared);
              }}
            >
              Clear
            </button>
          </div>
        </form>
      ) : null}
      {loading ? <Spinner /> : projects.length === 0 ? (
        <Empty title="No matching research projects" body="Adjust the filters, or open a Research Project when the current phase is complete." />
      ) : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Research Project</th>
                <th>Faculty / Professor</th>
                <th>Department</th>
                <th>Program</th>
                <th>Checklist</th>
                <th>Phase</th>
                <th>Status</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link className="font-semibold text-navy hover:underline" href={`/projects/${project.id}`}>{project.title}</Link>
                    {project.status === "ONGOING" && project.missingCount > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">{project.missingCount} required document{project.missingCount === 1 ? "" : "s"} still not approved</p>
                    ) : null}
                  </td>
                  <td>{facultyName(project.faculty)}</td>
                  <td>{project.department.name}</td>
                  <td>{project.program?.name ?? "—"}</td>
                  <td className="max-w-xs">{project.checklist.name}</td>
                  <td>{project.currentPhase?.name ?? "—"}</td>
                  <td><Badge value={project.status} /></td>
                  <td>{project.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
