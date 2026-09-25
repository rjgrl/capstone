"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { CHECKLIST_TYPE } from "@/lib/constants";
import { Alert, PageHeader, Spinner } from "@/components/ui";

type Options = {
  faculty: { id: string; firstName: string; lastName: string }[];
  checklists: { type: string; name: string }[];
};

export default function NewProjectPage() {
  const router = useRouter();
  const [options, setOptions] = useState<Options | null>(null);
  const [roleKey, setRoleKey] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [checklistType, setChecklistType] = useState<string>(CHECKLIST_TYPE.STANDARD);
  const [facultyId, setFacultyId] = useState("");

  useEffect(() => {
    Promise.all([api<Options>("/api/options"), api<{ user: { roleKey: string } }>("/api/auth/me")])
      .then(([optionData, session]) => {
        setOptions(optionData);
        setRoleKey(session.user.roleKey);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api<{ project: { id: string } }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ title, summary, year: Number(year), checklistType, facultyId }),
      });
      router.push(`/projects/${result.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The Research Project could not be created.");
      setPending(false);
    }
  }

  if (!options && !error) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New Research Project"
        description="The study stays on the first phase until every required document is submitted and the Department Head approves it."
      />
      {error ? <Alert>{error}</Alert> : null}
      <form className="card p-5" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">Research Project title</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Summary</span>
          <textarea className="textarea" value={summary} onChange={(event) => setSummary(event.target.value)} />
        </label>
        {roleKey === "SUPER_ADMIN" ? (
          <label className="field">
            <span className="label">Faculty / Professor</span>
            <select className="select" value={facultyId} onChange={(event) => setFacultyId(event.target.value)} required>
              <option value="">Select a faculty or professor</option>
              {options?.faculty.map((person) => (
                <option key={person.id} value={person.id}>{person.lastName}, {person.firstName}</option>
              ))}
            </select>
          </label>
        ) : null}
        <fieldset className="mb-4">
          <legend className="label">Documentary checklist</legend>
          <label className="mb-2 flex gap-2 text-sm">
            <input type="radio" name="checklist" checked={checklistType === CHECKLIST_TYPE.STANDARD} onChange={() => setChecklistType(CHECKLIST_TYPE.STANDARD)} />
            Research Process Documentary Requirements Checklist
          </label>
          <label className="flex gap-2 text-sm">
            <input type="radio" name="checklist" checked={checklistType === CHECKLIST_TYPE.PERSONALLY_FUNDED} onChange={() => setChecklistType(CHECKLIST_TYPE.PERSONALLY_FUNDED)} />
            Research Process Documentary Requirements Checklist for Personally Funded Research
          </label>
        </fieldset>
        <label className="field">
          <span className="label">Year</span>
          <input className="input" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} required />
        </label>
        <button className="btn-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Create Research Project"}</button>
      </form>
    </div>
  );
}
