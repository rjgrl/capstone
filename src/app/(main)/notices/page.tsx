"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/constants";
import { Alert, Badge, Empty, PageHeader, Spinner } from "@/components/ui";

type Notice = {
  id: string;
  subject: string;
  body: string;
  status: string;
  recipientEmail: string;
  createdAt: string;
  project: { id: string; title: string } | null;
  recipient: { name: string };
};

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ notices: Notice[] }>("/api/notices")
      .then((result) => setNotices(result.notices))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Email Notices"
        description="A researcher is emailed when the Department Head approves a file, requests a revision, or rejects a file. If email delivery is not configured, the notice is kept here."
      />
      {error ? <Alert>{error}</Alert> : null}
      {loading ? <Spinner /> : null}
      {!loading && !error && notices.length === 0 ? <Empty title="No email notices" body="Notices appear after a Department Head reviews a submitted file." /> : null}
      {notices.length > 0 ? (
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Sent</th><th>Recipient</th><th>Subject</th><th>Research Project</th><th>Delivery</th></tr></thead>
            <tbody>
              {notices.map((notice) => (
                <tr key={notice.id}>
                  <td>{formatDateTime(notice.createdAt)}</td>
                  <td>{notice.recipient.name}<div className="text-xs text-slate-500">{notice.recipientEmail}</div></td>
                  <td><button className="text-left font-semibold text-navy hover:underline" onClick={() => setOpen(notice)}>{notice.subject}</button></td>
                  <td>{notice.project ? <Link className="hover:underline" href={`/projects/${notice.project.id}`}>{notice.project.title}</Link> : "—"}</td>
                  <td><Badge value={notice.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {open ? (
        <div className="card mt-4 p-5">
          <h2 className="font-serif text-2xl text-navy">{open.subject}</h2>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-slate-700">{open.body}</pre>
        </div>
      ) : null}
    </div>
  );
}
