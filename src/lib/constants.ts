export const ROLE_KEYS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  RESEARCHER: "RESEARCHER",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const PROJECT_STATUS = {
  ONGOING: "ONGOING",
  FINISHED: "FINISHED",
} as const;

export const DOCUMENT_STATUS = {
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  REJECTED: "REJECTED",
} as const;

export const REVIEW_ACTION = {
  APPROVE: "APPROVE",
  REQUEST_REVISION: "REQUEST_REVISION",
  REJECT: "REJECT",
} as const;

export const CHECKLIST_TYPE = {
  STANDARD: "STANDARD",
  PERSONALLY_FUNDED: "PERSONALLY_FUNDED",
} as const;

export const RANKS = ["Faculty", "Professor"] as const;

export const PERMISSIONS = [
  {
    key: "dashboard.view",
    name: "View Dashboard",
    module: "Dashboard",
    description: "Open the research dashboard for the records this account is allowed to see.",
  },
  {
    key: "departments.manage",
    name: "Manage Departments",
    module: "Departments",
    description: "Create, update, and delete college departments.",
  },
  {
    key: "programs.manage",
    name: "Manage Programs",
    module: "Program",
    description: "Create, update, and delete academic programs.",
  },
  {
    key: "faculty.manage",
    name: "Manage Faculty / Professor Roster",
    module: "Faculties / Professor",
    description: "Create, update, and delete faculty and professor records.",
  },
  {
    key: "faculty.view",
    name: "View Faculty / Professor Profiles",
    module: "Faculties / Professor Profile",
    description: "Open a faculty or professor profile and its research records.",
  },
  {
    key: "users.manage",
    name: "Manage Users",
    module: "Users",
    description: "Create, update, deactivate, and delete user accounts.",
  },
  {
    key: "rbac.assign",
    name: "Assign and Remove User Functions",
    module: "Permissions",
    description: "Assign functions to a user and remove them.",
  },
  {
    key: "roles.view",
    name: "View Roles",
    module: "Roles",
    description: "View the Super Admin, Department Head, and Researcher roles.",
  },
  {
    key: "checklists.manage",
    name: "Manage Documentary Checklists",
    module: "Research Projects",
    description: "Maintain phases and documentary requirements on the two research checklists.",
  },
  {
    key: "projects.manage",
    name: "Manage Research Projects",
    module: "Research Projects",
    description: "Update and delete research projects within the account's scope.",
  },
  {
    key: "projects.create",
    name: "Create Research Projects",
    module: "Research Projects",
    description: "Open a research project when the researcher has no incomplete phase.",
  },
  {
    key: "projects.view",
    name: "View Research Projects",
    module: "Research Projects",
    description: "Open research projects and follow their phases.",
  },
  {
    key: "documents.upload",
    name: "Attach Phase Documents",
    module: "Research Projects",
    description: "Attach a PDF for a missing document in the current phase and sign the submission.",
  },
  {
    key: "documents.view",
    name: "View Attached Files",
    module: "Research Projects",
    description: "Open submitted and revised files in the PDF viewer.",
  },
  {
    key: "documents.review",
    name: "Approve, Request Revision, or Reject",
    module: "Research Projects",
    description: "Review a file against the documentary checklist.",
  },
  {
    key: "documents.attach_revision",
    name: "Attach a Revised File",
    module: "Research Projects",
    description: "Attach the file to revise when a phase needs correction.",
  },
  {
    key: "reports.generate",
    name: "Generate a Report",
    module: "Reports",
    description: "Generate the yearly project report and department counts.",
  },
  {
    key: "csv.exchange",
    name: "Import and Export CSV",
    module: "CSV",
    description: "Import or export module records as CSV.",
  },
  {
    key: "search.projects",
    name: "Search Research Projects",
    module: "Project Search",
    description: "Search research projects and apply filters.",
  },
  {
    key: "search.researchers",
    name: "Search Researchers",
    module: "Researcher Search",
    description: "Search for a specific faculty or professor.",
  },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  SUPER_ADMIN: PERMISSIONS.map((permission) => permission.key),
  DEPARTMENT_HEAD: [
    "dashboard.view",
    "faculty.view",
    "roles.view",
    "projects.view",
    "documents.view",
    "documents.review",
    "documents.attach_revision",
    "reports.generate",
    "csv.exchange",
    "search.projects",
    "search.researchers",
  ],
  RESEARCHER: [
    "dashboard.view",
    "faculty.view",
    "projects.view",
    "projects.create",
    "documents.upload",
    "documents.view",
  ],
};

export const ROLE_DETAILS: Record<RoleKey, { name: string; description: string }> = {
  SUPER_ADMIN: {
    name: "Super Admin",
    description:
      "Responsible for all system functions and assignments, including assigning and removing functions from other users.",
  },
  DEPARTMENT_HEAD: {
    name: "Department Head",
    description:
      "Reviews research files against the documentary checklist and the research phases for their department.",
  },
  RESEARCHER: {
    name: "Researcher",
    description:
      "Faculty or professor who submits the documents required for the current phase of a study.",
  },
};

export const STATUS_LABEL: Record<string, string> = {
  ONGOING: "Ongoing",
  FINISHED: "Finished",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REVISION_REQUESTED: "Revision Requested",
  REJECTED: "Rejected",
  MISSING: "Missing",
  APPROVE: "Approve",
  REQUEST_REVISION: "Request Revision",
  REJECT: "Reject",
  SENT: "Sent",
  LOGGED: "Logged",
  FAILED: "Failed",
};

export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export function facultyName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
