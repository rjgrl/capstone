"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { facultyName, formatBytes, formatDateTime, STATUS_LABEL } from "@/lib/constants";
import { Alert, Badge, Modal, PageHeader, Spinner } from "@/components/ui";
import { SignaturePad } from "@/components/SignaturePad";

type Review = {
  id: string;
  action: string;
  remarks: string | null;
  signatureData: string;
  revisedOriginalName: string | null;
  revisedStoredPath: string | null;
  createdAt: string;
  reviewer: { name: string };
};

type Item = {
  id: string;
  name: string;
  description: string | null;
  section: string | null;
  isRequired: boolean;
  requiresFile: boolean;
  status: string;
  document: null | {
    id: string;
    version: number;
    originalName: string;
    fileSize: number;
    submittedAt: string;
    status: string;
    signatureData: string;
    submittedBy: { name: string };
    reviews: Review[];
  };
};

type Phase = {
  id: string;
  name: string;
  description: string;
  sequence: number;
  state: "current" | "completed" | "pending";
  isComplete: boolean;
  missingCount: number;
  items: Item[];
};

type Detail = {
  project: {
    id: string;
    title: string;
    summary: string | null;
    status: string;
    year: number;
    finishedAt: string | null;
    faculty: { id: string; firstName: string; middleName?: string | null; lastName: string; rank: string };
    department: { name: string };
    program: { name: string } | null;
    checklist: { name: string; description: string };
    currentPhase: { id: string; name: string } | null;
  };
  phases: Phase[];
  reviewers: { id: string; name: string; role: { name: string } }[];
  actions: {
    canUpload: boolean;
    canReview: boolean;
    canAttachRevision: boolean;
    canAdvance: boolean;
    canFinish: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
};

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadItem, setUploadItem] = useState<Item | null>(null);
  const [review, setReview] = useState<{ item: Item; action: string } | null>(null);
  const [viewer, setViewer] = useState<{ id: string; title: string; revision: boolean } | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function load() {
    const result = await api<Detail>(`/api/projects/${params.id}`);
    setDetail(result);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [params.id]);

  const progress = useMemo(() => {
    if (!detail) return 0;
    const done = detail.phases.filter((phase) => phase.state === "completed" || (phase.state === "current" && phase.isComplete)).length;
    return detail.phases.length ? Math.round((done / detail.phases.length) * 100) : 0;
  }, [detail]);

  async function run(action: () => Promise<void>) {
    setError("");
    setNotice("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The action could not be completed.");
    }
  }

  if (error && !detail) return <Alert>{error}</Alert>;
  if (!detail) return <Spinner />;

  const current = detail.phases.find((phase) => phase.state === "current");
  const history = detail.phases.flatMap((phase) =>
    phase.items.flatMap((item) => {
      if (!item.document) return [];
      const entries: { at: string; text: string; signature: string; fileId?: string; revision?: boolean }[] = [
        {
          at: item.document.submittedAt,
          text: `${item.document.submittedBy.name} submitted ${item.name} (version ${item.document.version}) in ${phase.name}.`,
          signature: item.document.signatureData,
          fileId: item.document.id,
        },
      ];
      for (const action of item.document.reviews) {
        entries.push({
          at: action.createdAt,
          text: `${action.reviewer.name} chose ${STATUS_LABEL[action.action] ?? action.action} for ${item.name}.${action.remarks ? ` Remarks: ${action.remarks}` : ""}`,
          signature: action.signatureData,
          fileId: action.revisedStoredPath ? item.document.id : undefined,
          revision: Boolean(action.revisedStoredPath),
        });
      }
      return entries;
    }),
  ).sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <div>
      <PageHeader
        title={detail.project.title}
        description={detail.project.checklist.name}
        actions={
          <>
            {detail.actions.canEdit ? <button className="btn-secondary" onClick={() => setEditing(true)}>Edit Details</button> : null}
            {detail.actions.canDelete ? (
              <button
                className="btn-danger"
                onClick={() => {
                  if (!window.confirm("Delete this Research Project and its files?")) return;
                  run(async () => {
                    await api(`/api/projects/${detail.project.id}`, { method: "DELETE" });
                    router.push("/projects");
                  });
                }}
              >
                Delete
              </button>
            ) : null}
          </>
        }
      />
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">Phase progress</p>
              <p className="font-serif text-2xl text-navy">
                {current ? current.name : detail.project.status === "FINISHED" ? "All phases completed" : "No active phase"}
              </p>
            </div>
            <Badge value={detail.project.status} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full bg-navy" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{progress}% of phases approved</p>
          <p className="mt-4 text-sm text-slate-700">
            This Research Project stays on the current phase until every required document is submitted and the Department Head approves the phase. A new Research Project cannot be started while this phase is incomplete.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn-primary"
              disabled={!detail.actions.canAdvance}
              onClick={() =>
                run(async () => {
                  await api(`/api/projects/${detail.project.id}/advance`, { method: "POST" });
                  setNotice("The Research Project moved to the next phase.");
                })
              }
            >
              Advance to Next Phase
            </button>
            <button
              className="btn-secondary"
              disabled={!detail.actions.canFinish}
              onClick={() =>
                run(async () => {
                  await api(`/api/projects/${detail.project.id}/finish`, { method: "POST" });
                  setNotice("The Research Project is Finished.");
                })
              }
            >
              Mark as Finished
            </button>
          </div>
          {!detail.actions.canAdvance && detail.project.status === "ONGOING" ? (
            <p className="mt-3 text-xs text-slate-500">
              Advance stays unavailable until the Department Head has approved every required document in the current phase.
            </p>
          ) : null}
        </div>
        <aside className="card p-5 text-sm">
          <h2 className="font-serif text-xl text-navy">Project record</h2>
          <dl className="mt-3 space-y-2">
            <div><dt className="text-slate-500">Faculty / Professor</dt><dd><Link className="font-semibold text-navy hover:underline" href={`/faculty/${detail.project.faculty.id}`}>{facultyName(detail.project.faculty)}</Link> · {detail.project.faculty.rank}</dd></div>
            <div><dt className="text-slate-500">Department</dt><dd>{detail.project.department.name}</dd></div>
            <div><dt className="text-slate-500">Program</dt><dd>{detail.project.program?.name ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Year</dt><dd>{detail.project.year}</dd></div>
            <div><dt className="text-slate-500">Finished</dt><dd>{detail.project.finishedAt ? formatDateTime(detail.project.finishedAt) : "—"}</dd></div>
          </dl>
          {detail.project.summary ? <p className="mt-3 text-slate-700">{detail.project.summary}</p> : null}
          <h3 className="mt-4 font-semibold text-navy">Responsible for review</h3>
          <ul className="mt-1 space-y-1">
            {detail.reviewers.length === 0 ? <li>No Department Head is assigned to this department.</li> : detail.reviewers.map((person) => (
              <li key={person.id}>{person.name} · {person.role.name}</li>
            ))}
          </ul>
        </aside>
      </section>

      <ol className="mt-6 space-y-4">
        {detail.phases.map((phase) => (
          <li key={phase.id} className={`card overflow-hidden ${phase.state === "current" ? "ring-2 ring-gold" : ""}`}>
            <div className="flex flex-col gap-3 border-b border-line bg-paper/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${phase.state === "pending" ? "bg-slate-200 text-slate-600" : "bg-navy text-white"}`}>{phase.sequence}</span>
                <div>
                  <h2 className="font-serif text-2xl text-navy">{phase.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{phase.description}</p>
                </div>
              </div>
              <Badge value={phase.state} />
            </div>
            <div className="p-5">
              {phase.state === "pending" ? (
                <p className="mb-3 text-sm text-slate-600">This phase opens after the current phase is approved. The documentary requirements are listed so the full process is visible.</p>
              ) : null}
              <div className="table-wrap">
                <table className="data-table min-w-[680px]">
                  <thead>
                    <tr>
                      <th>Documentary Requirement</th>
                      <th>Requirement</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedItems(phase.items).map((group) => (
                      <GroupRows
                        key={group.section}
                        group={group}
                        phaseState={phase.state}
                        actions={detail.actions}
                        onView={(id, title, revision) => setViewer({ id, title, revision })}
                        onUpload={setUploadItem}
                        onReview={(item, action) => setReview({ item, action })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section className="card mt-6 p-5">
        <h2 className="font-serif text-2xl text-navy">Tracking</h2>
        {history.length === 0 ? <p className="mt-2 text-sm text-slate-600">No files have been submitted yet.</p> : (
          <ol className="mt-4 space-y-4">
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="border-l-2 border-gold pl-4">
                <p className="text-xs text-slate-500">{formatDateTime(entry.at)}</p>
                <p className="text-sm">{entry.text}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="btn-ghost" onClick={() => setSignaturePreview(entry.signature)}>View E-signature</button>
                  {entry.fileId ? (
                    <button className="btn-ghost" onClick={() => setViewer({ id: entry.fileId!, title: "File", revision: Boolean(entry.revision) })}>
                      {entry.revision ? "View Revised File" : "View PDF"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {uploadItem ? (
        <UploadDialog
          item={uploadItem}
          onClose={() => setUploadItem(null)}
          onSubmit={async (form) => {
            await api(`/api/projects/${detail.project.id}/documents`, { method: "POST", body: form });
            setUploadItem(null);
            setNotice("The PDF was submitted with your e-signature.");
            await load();
          }}
        />
      ) : null}
      {review ? (
        <ReviewDialog
          item={review.item}
          action={review.action}
          requireFile={review.action === "REQUEST_REVISION" && detail.actions.canAttachRevision}
          onClose={() => setReview(null)}
          onSubmit={async (form) => {
            await api(`/api/documents/${review.item.document!.id}/review`, { method: "POST", body: form });
            setReview(null);
            setNotice("The review was recorded and the researcher was notified by email.");
            await load();
          }}
        />
      ) : null}
      {viewer ? <PdfDialog viewer={viewer} onClose={() => setViewer(null)} /> : null}
      {signaturePreview ? (
        <Modal title="E-signature" onClose={() => setSignaturePreview(null)}>
          <img src={signaturePreview} alt="E-signature" className="max-h-48 bg-white" />
        </Modal>
      ) : null}
      {editing ? (
        <EditDialog
          project={detail.project}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            setNotice("Research Project details were updated.");
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function groupedItems(items: Item[]) {
  const groups: { section: string; items: Item[] }[] = [];
  for (const item of items) {
    const section = item.section || "Documentary Requirements";
    const current = groups[groups.length - 1];
    if (current && current.section === section) current.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}

function GroupRows({
  group,
  phaseState,
  actions,
  onView,
  onUpload,
  onReview,
}: {
  group: { section: string; items: Item[] };
  phaseState: Phase["state"];
  actions: Detail["actions"];
  onView: (id: string, title: string, revision: boolean) => void;
  onUpload: (item: Item) => void;
  onReview: (item: Item, action: string) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={5} className="bg-paper font-semibold text-navy">{group.section}</td>
      </tr>
      {group.items.map((item) => (
        <tr key={item.id}>
          <td>
            <p className="font-semibold">{item.name}</p>
            {item.description ? <p className="mt-1 text-xs text-slate-500">{item.description}</p> : null}
          </td>
          <td>{item.requiresFile ? (item.isRequired ? "Required" : "Optional") : "No file"}</td>
          <td>{item.requiresFile ? <Badge value={item.status} /> : "—"}</td>
          <td>
            {item.document ? (
              <>
                <p>{formatDateTime(item.document.submittedAt)}</p>
                <p className="text-xs text-slate-500">Version {item.document.version} · {formatBytes(item.document.fileSize)}</p>
              </>
            ) : "—"}
          </td>
          <td>
            <div className="flex flex-wrap gap-2">
              {item.document ? (
                <button className="btn-secondary" onClick={() => onView(item.document!.id, item.name, false)}>View PDF</button>
              ) : null}
              {item.document?.reviews.some((action) => action.revisedStoredPath) ? (
                <button className="btn-secondary" onClick={() => onView(item.document!.id, `${item.name} revision`, true)}>View Revised File</button>
              ) : null}
              {item.requiresFile && actions.canUpload && phaseState === "current" && item.status !== "SUBMITTED" && item.status !== "APPROVED" ? (
                <button className="btn-primary" onClick={() => onUpload(item)}>Attach PDF</button>
              ) : null}
              {item.requiresFile && actions.canReview && phaseState === "current" && item.status === "SUBMITTED" ? (
                <>
                  <button className="btn-primary" onClick={() => onReview(item, "APPROVE")}>Approve</button>
                  {actions.canAttachRevision ? <button className="btn-secondary" onClick={() => onReview(item, "REQUEST_REVISION")}>Request Revision</button> : null}
                  <button className="btn-danger" onClick={() => onReview(item, "REJECT")}>Reject</button>
                </>
              ) : null}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function UploadDialog({ item, onClose, onSubmit }: { item: Item; onClose: () => void; onSubmit: (form: FormData) => Promise<void> }) {
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <Modal title={`Attach PDF · ${item.name}`} onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          const form = new FormData(event.currentTarget);
          form.set("checklistItemId", item.id);
          form.set("signature", signature);
          try {
            await onSubmit(form);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
            setPending(false);
          }
        }}
      >
        {error ? <Alert>{error}</Alert> : null}
        <p className="mb-3 text-sm text-slate-600">Your e-signature confirms that this file was submitted for the current phase.</p>
        <label className="field">
          <span className="label">PDF file</span>
          <input className="input" type="file" name="file" accept="application/pdf,.pdf" required />
        </label>
        <SignaturePad onChange={setSignature} />
        <button className="btn-primary mt-4" disabled={pending} type="submit">{pending ? "Submitting…" : "Submit and Sign"}</button>
      </form>
    </Modal>
  );
}

function ReviewDialog({
  item,
  action,
  requireFile,
  onClose,
  onSubmit,
}: {
  item: Item;
  action: string;
  requireFile: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
}) {
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const title = STATUS_LABEL[action] ?? "Review";

  return (
    <Modal title={`${title} · ${item.name}`} onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          const form = new FormData(event.currentTarget);
          form.set("action", action);
          form.set("signature", signature);
          try {
            await onSubmit(form);
          } catch (err) {
            setError(err instanceof Error ? err.message : "The review could not be saved.");
            setPending(false);
          }
        }}
      >
        {error ? <Alert>{error}</Alert> : null}
        <label className="field">
          <span className="label">Remarks</span>
          <textarea className="textarea" name="remarks" required={action !== "APPROVE"} placeholder={action === "REJECT" ? "Explain why the file does not match the checklist." : "Explain what needs to change."} />
        </label>
        {action === "REQUEST_REVISION" ? (
          <label className="field">
            <span className="label">Revised file</span>
            <input className="input" type="file" name="file" accept="application/pdf,.pdf" required={requireFile} />
          </label>
        ) : null}
        <SignaturePad onChange={setSignature} />
        <button className="btn-primary mt-4" disabled={pending} type="submit">{pending ? "Saving…" : title}</button>
      </form>
    </Modal>
  );
}

function PdfDialog({ viewer, onClose }: { viewer: { id: string; title: string; revision: boolean }; onClose: () => void }) {
  const src = `/api/documents/${viewer.id}/file${viewer.revision ? "?kind=revision" : ""}`;
  return (
    <Modal title={viewer.title} onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <a className="btn-secondary" href={`${src}${src.includes("?") ? "&" : "?"}download=1`}>Download</a>
      </div>
      <iframe title={viewer.title} src={src} className="h-[70vh] w-full rounded-md border border-line bg-slate-100" />
    </Modal>
  );
}

function EditDialog({
  project,
  onClose,
  onSaved,
}: {
  project: Detail["project"];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <Modal title="Edit Research Project" onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await api(`/api/projects/${project.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                title: form.get("title"),
                summary: form.get("summary"),
                year: Number(form.get("year")),
              }),
            });
            await onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Update failed.");
          }
        }}
      >
        {error ? <Alert>{error}</Alert> : null}
        <label className="field"><span className="label">Title</span><input className="input" name="title" defaultValue={project.title} required /></label>
        <label className="field"><span className="label">Summary</span><textarea className="textarea" name="summary" defaultValue={project.summary ?? ""} /></label>
        <label className="field"><span className="label">Year</span><input className="input" name="year" defaultValue={project.year} required /></label>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </Modal>
  );
}
