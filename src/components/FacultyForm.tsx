"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import { Alert, Modal } from "@/components/ui";

export type FacultyFormValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  rank: string;
  departmentId: string;
  programId: string;
  contactInformation: string;
  mobileNumber: string;
  institutionalEmail: string;
  facebookAccount: string;
};

type Options = {
  departments: { id: string; name: string }[];
  programs: { id: string; name: string; departmentId?: string }[];
};

export function FacultyForm({
  initial,
  options,
  onClose,
  onSaved,
  id,
}: {
  initial: FacultyFormValues;
  options: Options | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  id?: string;
}) {
  const [error, setError] = useState("");
  const [departmentId, setDepartmentId] = useState(initial.departmentId);
  const programs = (options?.programs ?? []).filter(
    (program) => !departmentId || program.departmentId === departmentId,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      await api(id ? `/api/faculty/${id}` : "/api/faculty", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <Modal title={id ? "Edit Faculty / Professor" : "Add Faculty / Professor"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field"><span className="label">First name</span><input className="input" name="firstName" defaultValue={initial.firstName} required /></label>
          <label className="field"><span className="label">Middle name</span><input className="input" name="middleName" defaultValue={initial.middleName} /></label>
          <label className="field"><span className="label">Last name</span><input className="input" name="lastName" defaultValue={initial.lastName} required /></label>
          <label className="field"><span className="label">Rank</span><select className="select" name="rank" defaultValue={initial.rank}><option>Faculty</option><option>Professor</option></select></label>
          <label className="field">
            <span className="label">Department</span>
            <select className="select" name="departmentId" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required>
              <option value="">Select a department</option>
              {options?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Program</span>
            <select className="select" name="programId" defaultValue={initial.programId}>
              <option value="">No program</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
            </select>
          </label>
          <label className="field"><span className="label">Mobile number</span><input className="input" name="mobileNumber" defaultValue={initial.mobileNumber} required /></label>
          <label className="field"><span className="label">Institutional email</span><input className="input" type="email" name="institutionalEmail" defaultValue={initial.institutionalEmail} required /></label>
        </div>
        <label className="field"><span className="label">Contact information</span><textarea className="textarea" name="contactInformation" defaultValue={initial.contactInformation} /></label>
        <label className="field"><span className="label">Facebook account</span><input className="input" name="facebookAccount" defaultValue={initial.facebookAccount} /></label>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </Modal>
  );
}
