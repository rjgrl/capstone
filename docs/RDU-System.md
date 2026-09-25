# Research and Development Unit (RDU)

System documentation derived from the modules brief (`MODULES.pdf`). This document describes the modules, roles, research workflow, and dashboard the RDU system is expected to provide.

## Purpose

The Research and Development Unit system tracks faculty and professor research from submission through completion. It stores researcher profiles, research projects, and the documentary requirements for each phase. Department heads review those documents. Researchers cannot move to the next phase, or start another study, until the current phase is complete and the department head has approved it.

## Modules

| Module | What it covers |
| --- | --- |
| Roles | The three user roles: Super Admin, Department Head, and Researcher (Faculty/Professor). |
| Users (RBAC) | Role-based access control. Super Admin assigns and removes what each user can do. |
| Permissions | The functions tied to a role or user. |
| Departments | College departments that own researchers and research projects. |
| Program | Academic programs associated with departments and researchers. |
| Faculties / Professor | The roster of faculty and professors who conduct research. |
| Faculties / Professor Profile | The full record for one researcher, including contact details and their projects. |

## Roles

### Super Admin

The Super Admin is responsible for all system functions and assignments. This role can use every function in the system, including assigning and removing functions from other users through RBAC.

### Department Head

The Department Head reviews research papers against the documentary-requirements checklist and the research phases.

A Department Head can:

- See every attached file for a research project.
- Open those files in a PDF viewer.
- Attach a revised file when a phase needs correction.
- Approve a file, request a revision, or reject a file that does not match the checklist.
- Sign the decision with an e-signature.
- Send the researcher an email whenever a revision or request is made.
- Generate a report.

### Researcher (Faculty / Professor)

The researcher submits the documents required for the current phase of a study.

A researcher can:

- Attach a file for the current phase of the research.
- Insert a PDF for any document that is still missing.
- Sign the submission with an e-signature to confirm the file was submitted.

A researcher cannot move to the next phase, and cannot start another research study, until every missing document in the current phase is provided and the whole requirements of that phase are finished. The Department Head must approve the phase before the research can continue.

## Faculty / Professor profile

Each faculty or professor profile stores:

- Faculty / professor details
- Contact information
- Mobile number
- Institutional email
- Facebook account
- Research projects, split into ongoing and finished
- Tracking of those projects

## Research projects

Every research project is either **ongoing** or **finished**, and it moves through phases. Progress is tracked on the researcher profile and on the project itself.

Two documentary checklists apply:

1. **Research Process Documentary Requirements Checklist** — used for all research.
2. **Research Process Documentary Requirements Checklist for Personally Funded Research** — used when the study is personally funded.

The checklist is the standard the Department Head uses when approving, requesting a revision, or rejecting a file. The individual checklist items are maintained as part of that checklist; this modules brief does not list them line by line.

## Review workflow

```text
Researcher uploads the phase PDF and signs it
        │
        ▼
Department Head opens the file in the PDF viewer
        │
        ├── Approve ──────────────► phase is complete; research may advance
        │
        ├── Request revision ─────► Head attaches the file to revise,
        │                           signs it, and the researcher is emailed
        │
        └── Reject ───────────────► file is not related to the checklist;
                                    researcher is notified
```

Rules that govern the workflow:

- Review happens phase by phase, against the checklist.
- Every revision or request from the Department Head notifies the researcher by email.
- The Department Head provides an e-signature with that action.
- The researcher’s e-signature indicates that the file was submitted.
- The researcher stays on the current phase until missing documents are supplied and the Department Head approves.
- The researcher cannot open another research study while a phase is still incomplete.

## Dashboard

The dashboard summarizes research across the unit:

- All finished projects
- All ongoing projects
- Yearly project report
- Number of researches per college department

College departments reported separately:

- College of Technology
- College of Nursing
- College of Education
- College of Arts and Sciences
- College of Business
- College of Public Administration and Governance
- College of Medicine

## Shared functions

These functions are available across the system, within the limits of each role:

| Function | Description |
| --- | --- |
| Login / Logout | Users sign in and sign out. |
| CRUD | Create, read, update, and delete records for the modules above. |
| CSV | Import or export records as CSV. |
| Project search | Search research projects with filters. |
| Researcher search | Search for a specific faculty or professor. |
| RBAC (Super Admin) | Assign functions to a user and remove them. |
| PDF viewer | Open submitted and revised research files. |
| E-signature | Researcher signs a submission; Department Head signs a review action. |
| Email notice | Researcher is emailed when the Department Head requests a revision or takes a related action. |
| Reports | Department Head can generate a report. Dashboard includes the yearly project report. |

## Access by role

| Capability | Super Admin | Department Head | Researcher |
| --- | --- | --- | --- |
| All system functions and assignments | Yes | — | — |
| Assign and remove user functions (RBAC) | Yes | — | — |
| Review files against the checklist and phases | Yes | Yes | — |
| View attached files in the PDF viewer | Yes | Yes | Own submissions |
| Attach a file that needs revision | Yes | Yes | — |
| Approve, request revision, or reject | Yes | Yes | — |
| E-signature on a review decision | Yes | Yes | — |
| Email the researcher about a revision or request | Yes | Yes | — |
| Generate a report | Yes | Yes | — |
| Attach a phase file / missing-document PDF | Yes | — | Yes |
| E-signature on submission | Yes | — | Yes |
| Advance to the next phase without approval | No | No | No |
| Start another study while a phase is incomplete | No | No | No |
