const base = "http://127.0.0.1:3000";
const password = "Rdu-Admin-2026";
const signature =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(email) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  assert(response.ok, `Login failed for ${email}: ${body.error}`);
  const cookie = response.headers.getSetCookie?.() ?? [];
  const raw = cookie.find((item) => item.startsWith("rdu_session=")) || response.headers.get("set-cookie");
  assert(raw, "Missing session cookie");
  return raw.split(";")[0];
}

async function call(cookie, path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 120) };
  }
  return { status: response.status, data, headers: response.headers };
}

const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 20 80 Td (RDU test) Tj ET\nendstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF",
);

const anon = await call("", "/api/projects");
assert(anon.status === 401, `Expected 401, got ${anon.status}`);

const bad = await call("", "/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "superadmin@rdu.local", password: "wrong-password" }),
});
assert(bad.status === 401, `Bad password should be 401, got ${bad.status}`);

const maria = await login("maria.santos@rdu.local");
const deniedUsers = await call(maria, "/api/users");
assert(deniedUsers.status === 403, `Researcher users API should be 403, got ${deniedUsers.status}`);

const second = await call(maria, "/api/projects", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Second study that must be blocked",
    checklistType: "STANDARD",
    year: 2026,
  }),
});
assert(second.status === 409, `Second project should be blocked, got ${second.status} ${second.data.error}`);

const projects = await call(maria, "/api/projects");
assert(projects.status === 200, "Researcher project list failed");
assert(projects.data.projects.length === 1, "Researcher should see only their own project");
const projectId = projects.data.projects[0].id;

const detail = await call(maria, `/api/projects/${projectId}`);
assert(detail.status === 200, "Project detail failed");
const item = detail.data.phases.find((phase) => phase.state === "current").items[0];
const form = new FormData();
form.set("checklistItemId", item.id);
form.set("signature", signature);
form.set("file", new Blob([pdf], { type: "application/pdf" }), "proposal.pdf");
const uploaded = await call(maria, `/api/projects/${projectId}/documents`, { method: "POST", body: form });
assert(uploaded.status === 201, `Upload failed ${uploaded.status} ${uploaded.data.error}`);

const advance = await call(maria, `/api/projects/${projectId}/advance`, { method: "POST" });
assert(advance.status === 409, `Advance without approval should fail, got ${advance.status}`);

const reviewAsResearcher = await call(maria, `/api/documents/${uploaded.data.document.id}/review`, {
  method: "POST",
  body: (() => {
    const body = new FormData();
    body.set("action", "APPROVE");
    body.set("signature", signature);
    return body;
  })(),
});
assert(reviewAsResearcher.status === 403, `Researcher review should be 403, got ${reviewAsResearcher.status}`);

const head = await login("head.technology@rdu.local");
const headProjects = await call(head, "/api/projects");
assert(headProjects.data.projects.every((project) => project.department.name === "College of Technology"), "Head saw another department");
const nursing = await call(head, "/api/faculty?q=Ana");
assert(nursing.status === 200 && nursing.data.faculty.length === 0, "Head should not see College of Nursing faculty");

const file = await call(head, `/api/documents/${uploaded.data.document.id}/file`);
assert(file.status === 200, `PDF viewer file failed ${file.status}`);

const reviewForm = new FormData();
reviewForm.set("action", "APPROVE");
reviewForm.set("signature", signature);
reviewForm.set("remarks", "Matches the checklist.");
const reviewed = await call(head, `/api/documents/${uploaded.data.document.id}/review`, { method: "POST", body: reviewForm });
assert(reviewed.status === 200, `Review failed ${reviewed.status} ${reviewed.data.error}`);

const notices = await call(maria, "/api/notices");
assert(notices.data.notices.some((notice) => notice.subject.includes("approved")), "Researcher did not receive the email notice");

const stillBlocked = await call(maria, `/api/projects/${projectId}/advance`, { method: "POST" });
assert(stillBlocked.status === 409, "Phase advanced before every document was approved");

const admin = await login("superadmin@rdu.local");
const dashboard = await call(admin, "/api/dashboard");
assert(dashboard.data.dashboard.ongoing >= 1, "Dashboard missing ongoing projects");
assert(dashboard.data.dashboard.finished >= 1, "Dashboard missing finished projects");
assert(dashboard.data.dashboard.byDepartment.length === 7, "Dashboard should list all seven departments");
const report = await call(admin, "/api/reports?year=2025");
assert(report.data.report.finished === 1, `2025 report should have 1 finished project, got ${report.data.report.finished}`);

console.log("Workflow checks passed.");
