export type OfficialItem = {
  section: string;
  name: string;
  description?: string;
  isRequired: boolean;
  requiresFile: boolean;
};

export type OfficialPhase = {
  name: string;
  description: string;
  items: OfficialItem[];
};

export type OfficialChecklist = {
  name: string;
  description: string;
  phases: OfficialPhase[];
};

function file(section: string, name: string, isRequired = true, description?: string): OfficialItem {
  return { section, name, description, isRequired, requiresFile: true };
}

function note(section: string, name: string): OfficialItem {
  return { section, name, isRequired: false, requiresFile: false };
}

const callForProposal = "A. Call for Proposal";
const inHouseReview = "B. In-House Review of Research Proposals";
const proposalDevelopment = "A. Proposal Development — For Accepted Proposals";
const rec = "B. Research Ethics Committee (REC) Requirements";
const gad = "C. Gender and Development Requirement";
const authorization = "A. Authorization and Compliance";
const implementation = "B. Research Implementation";
const finalPaper = "C. Completed Research Paper — Complete/Final Research Paper";
const quality = "C. Completed Research Paper — Quality and Originality Checks";
const inHouseDissemination = "D. Dissemination — In-House Dissemination";
const externalDissemination = "D. Dissemination — External Dissemination";
const publication = "E. Publication";
const utilization = "E. Utilization";

export const STANDARD_CHECKLIST: OfficialChecklist = {
  name: "Research Process Documentary Requirements Checklist",
  description: "Documentary requirements for each phase of the research process.",
  phases: [
    {
      name: "Conceptualization Phase",
      description: "Call for proposal and in-house review of research proposals.",
      items: [
        file(callForProposal, "Call for Research Proposals"),
        file(callForProposal, "Capsule Proposal of Faculty/Researcher"),
        file(callForProposal, "Other supporting document/s related to the conceptualization of the research, if applicable", false),
        file(inHouseReview, "Program – In-House Review of Research Proposals"),
        file(inHouseReview, "Proposal submitted for In-House Review"),
        file(inHouseReview, "Summary of Comments and Suggestions from the Panel"),
        file(inHouseReview, "Notice of Acceptance or Notice of Non-Acceptance"),
      ],
    },
    {
      name: "Development Phase",
      description: "Proposal development for accepted proposals, Research Ethics Committee requirements, and the gender and development requirement.",
      items: [
        file(proposalDevelopment, "Revised Proposal / Full-Blown Research Proposal"),
        file(proposalDevelopment, "Action Done Matrix addressing the comments and suggestions of the panel"),
        file(rec, "Letter Request for REC Evaluation addressed to the REC Chair"),
        file(rec, "Accomplished REC Form 6A"),
        file(rec, "Accomplished REC Form 4A"),
        file(rec, "Curriculum Vitae (CV) of Researcher/s"),
        file(rec, "Research Instruments / Questionnaires / Data Gathering Tools"),
        file(rec, "Informed Consent Form"),
        file(rec, "Screenshot, Email, Letter, or other proof of endorsement/submission to REC"),
        file(rec, "Action Done Matrix, if revisions were required by REC", false),
        file(rec, "Other document/s required by REC, if applicable", false),
        file(gad, "Accomplished HGDG Form"),
      ],
    },
    {
      name: "Implementation Phase",
      description: "Authorization and compliance, research implementation, the completed research paper, dissemination, publication, and utilization.",
      items: [
        file(authorization, "Ethics Clearance"),
        file(authorization, "Research Contract, if applicable", false),
        file(authorization, "Approved Letter/Authority to Conduct the Study, if applicable", false),
        file(implementation, "Progress Report/s, if applicable", false),
        file(implementation, "Accomplished Data Gathering Tools and Instruments"),
        file(implementation, "Other supporting evidence/documentation of research implementation, if applicable", false),
        file(finalPaper, "Abstract"),
        file(finalPaper, "Introduction"),
        file(finalPaper, "Review of Related Literature / Theoretical or Conceptual Framework, as applicable", true, "Theoretical or conceptual framework, as applicable."),
        file(finalPaper, "Methodology"),
        file(finalPaper, "Results and Discussion"),
        file(finalPaper, "Conclusions"),
        file(finalPaper, "Recommendations, if applicable", false),
        file(finalPaper, "References"),
        file(finalPaper, "Appendices, if applicable", false),
        file(quality, "Grammarly Report"),
        file(quality, "Plagiarism/Similarity Report"),
        file(inHouseDissemination, "Complete Research Paper"),
        file(inHouseDissemination, "Presentation Material / Presentation File"),
        file(inHouseDissemination, "Certificate of Presentation/Participation"),
        file(externalDissemination, "Approved Letter/Authority to Present, if applicable", false),
        file(externalDissemination, "Certificate of Presentation / Participation"),
        file(externalDissemination, "Conference/Research Presentation Program, if applicable", false),
        file(externalDissemination, "Copy of Presentation Material, if required", false),
        file(externalDissemination, "Signed Consent to Present, if applicable", false),
        file(externalDissemination, "Other proof of dissemination, if applicable", false),
        file(publication, "Accomplished Journal Verification Form"),
        file(publication, "Signed Consent to Publish, if applicable", false),
        file(publication, "Copy of Published Research Paper"),
        file(publication, "Other proof of publication, if applicable", false),
        file(utilization, "Signed MOA/MOU"),
        file(utilization, "Certificate of Utilization"),
        file(utilization, "Testimony"),
        file(utilization, "Proof of Utilization"),
      ],
    },
    {
      name: "Monitoring and Evaluation",
      description: "Monitoring covers the whole process of the research project. Evaluation is conducted at key stages, particularly during conceptualization, dissemination, and publication.",
      items: [
        note("A. Monitoring", "Monitoring covers the whole process of the research project."),
        note("B. Evaluation", "Evaluation is conducted at key stages of the research process, particularly during conceptualization, dissemination and publication."),
      ],
    },
  ],
};

export const PERSONALLY_FUNDED_CHECKLIST: OfficialChecklist = {
  name: "Research Process Documentary Requirements Checklist for Personally-Funded Research",
  description: "Based on the Approved 2024 Policy on Managing of Research Funds.",
  phases: [
    {
      name: "Documentary Requirements",
      description: "Documents required for personally-funded research.",
      items: [
        file("Documentary Requirements", "Letter-request for publication incentives addressed to the director of the Research and Development Unit"),
        file("Documentary Requirements", "Published research output in Scopus or Web of Science-indexed journals"),
        file("Documentary Requirements", "Proof of Indexing of Journal in Scopus or Web of Science-indexed journals"),
        file("Documentary Requirements", "Other relevant publication documents", false),
      ],
    },
  ],
};
