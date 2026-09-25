"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { facultyName } from "@/lib/constants";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { FacultyForm } from "@/components/FacultyForm";

type Project = {
  id: string;
  title: string;
  status: string;
  year: number;
  phaseName: string | null;
  phaseComplete: boolean;
  missingCount: number;
  canOpen: boolean;
  checklist: { name: string };
  department: { name: string };
  program: { name: string } | null;
};

type Profile = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  rank: string;
  contactInformation?: string | null;
  mobileNumber: string;
  institutionalEmail: string;
  facebookAccount?: string | null;
  department: { id: string; name: string };
  program: { id: string; name: string } | null;
  user: { email: string; isActive: boolean; role: { name: string } } | null;
  projects: Project[];
};

export default function FacultyProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<{ departments: { id: string; name: string }[]; programs: { id: string; name: string; departmentId: string }[] } | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const result = await api<{ faculty: Profile }>(`/api/faculty/${params.id}`);
    setProfile(result.faculty);
  }

  useEffect(() => {
    Promise.all([
      api<{ faculty: Profile }>(`/api/faculty/${params.id}`),
      api<{ permissions: string[] }>("/api/auth/me"),
      api<{ departments: { id: string; name: string }[]; programs: { id: string; name: string; departmentId: string }[] }>("/api/options"),
    ])
      .then(([result, session, optionData]) => {
        setProfile(result.faculty);
        setCanManage(session.permissions.includes("faculty.manage"));
        setOptions(optionData);
      })
      .catch((err) => setError(err.message));
  }, [params.id]);

  if (error && !profile) return <Alert>{error}</Alert>;
  if (!profile) return <Spinner />;

  const ongoing = profile.projects.filter((project) => project.status === "ONGOING");
  const finished = profile.projects.filter((project) => project.status === "FINISHED");

  return (
    <div>
      <PageHeader
        title={facultyName(profile)}
        description={`${profile.rank} · ${profile.department.name}`}
        actions={canManage ? (
          <>
            <button className="btn-secondary" onClick={() => setEditing(true)}>Edit Profile</button>
            <button className="btn-danger" onClick={async () => {
              if (!window.confirm("Delete this Faculty / Professor profile?")) return;
              try {
                await api(`/api/faculty/${profile.id}`, { method: "DELETE" });
                router.push("/faculty");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Delete failed.");
              }
            }}>Delete</button>
          </>
        ) : null}
      />
      {error ? <Alert>{error}</Alert> : null}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card p-5">
          <h2 className="font-serif text-2xl text-navy">Faculty / Professor details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-slate-500">Rank</dt><dd>{profile.rank}</dd></div>
            <div><dt className="text-slate-500">Department</dt><dd>{profile.department.name}</dd></div>
            <div><dt className="text-slate-500">Program</dt><dd>{profile.program?.name ?? "—"}</dd></div>
            <div><dt className="text-slate-500">User account</dt><dd>{profile.user ? `${profile.user.role.name} · ${profile.user.isActive ? "Active" : "Inactive"}` : "No login"}</dd></div>
          </dl>
        </article>
        <article className="card p-5">
          <h2 className="font-serif text-2xl text-navy">Contact information</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-slate-500">Contact information</dt><dd>{profile.contactInformation || "—"}</dd></div>
            <div><dt className="text-slate-500">Mobile number</dt><dd>{profile.mobileNumber}</dd></div>
            <div><dt className="text-slate-500">Institutional email</dt><dd>{profile.institutionalEmail}</dd></div>
            <div><dt className="text-slate-500">Facebook account</dt><dd>{profile.facebookAccount || "—"}</dd></div>
          </dl>
        </article>
      </section>
      <ProjectTable title="Ongoing research" projects={ongoing} />
      <ProjectTable title="Finished research" projects={finished} />
      {editing && options ? (
        <FacultyForm
          id={profile.id}
          options={options}
          initial={{
            firstName: profile.firstName,
            middleName: profile.middleName ?? "",
            lastName: profile.lastName,
            rank: profile.rank,
            departmentId: profile.department.id,
            programId: profile.program?.id ?? "",
            contactInformation: profile.contactInformation ?? "",
            mobileNumber: profile.mobileNumber,
            institutionalEmail: profile.institutionalEmail,
            facebookAccount: profile.facebookAccount ?? "",
          }}
          onClose={() => setEditing(false)}
          onSaved={async () => { setEditing(false); await load(); }}
        />
      ) : null}
    </div>
  );
}

function ProjectTable({ title, projects }: { title: string; projects: Project[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 font-serif text-2xl text-navy">{title}</h2>
      {projects.length === 0 ? <p className="text-sm text-slate-600">None recorded.</p> : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Research Project</th><th>Checklist</th><th>Phase</th><th>Phase status</th><th>Department</th><th>Year</th></tr></thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.canOpen ? <Link className="font-semibold text-navy hover:underline" href={`/projects/${project.id}`}>{project.title}</Link> : project.title}</td>
                  <td>{project.checklist.name}</td>
                  <td>{project.phaseName ?? "—"}</td>
                  <td>{project.status === "FINISHED" || project.phaseComplete ? <Badge value="APPROVED" /> : <span className="text-sm">{project.missingCount} still not approved</span>}</td>
                  <td>{project.department.name}</td>
                  <td>{project.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
