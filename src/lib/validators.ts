import { z } from "zod";
import { CHECKLIST_TYPE, RANKS } from "@/lib/constants";

const email = z.string().trim().email("Enter a valid email address.").max(160);
const requiredText = (label: string, max = 160) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Password is too long.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const departmentSchema = z.object({
  name: requiredText("Department name", 160),
  code: z
    .string()
    .trim()
    .min(2, "Department code is required.")
    .max(20, "Department code is too long.")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, or hyphens for the department code."),
});

export const programSchema = z.object({
  name: requiredText("Program name", 160),
  departmentId: requiredText("Department"),
});

export const facultySchema = z.object({
  firstName: requiredText("First name"),
  middleName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: requiredText("Last name"),
  rank: z.enum(RANKS, { message: "Select Faculty or Professor." }),
  departmentId: requiredText("Department"),
  programId: z.string().trim().optional().or(z.literal("")),
  contactInformation: z.string().trim().max(500).optional().or(z.literal("")),
  mobileNumber: z
    .string()
    .trim()
    .min(7, "Enter a mobile number.")
    .max(30, "Mobile number is too long."),
  institutionalEmail: email,
  facebookAccount: z.string().trim().max(160).optional().or(z.literal("")),
});

export const userSchema = z.object({
  name: requiredText("Name"),
  email,
  password: passwordSchema.optional().or(z.literal("")),
  roleId: requiredText("Role"),
  departmentId: z.string().trim().optional().or(z.literal("")),
  facultyId: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const projectSchema = z.object({
  title: requiredText("Research Project title", 240),
  summary: z.string().trim().max(2000).optional().or(z.literal("")),
  facultyId: z.string().trim().optional().or(z.literal("")),
  checklistType: z.enum([CHECKLIST_TYPE.STANDARD, CHECKLIST_TYPE.PERSONALLY_FUNDED], {
    message: "Select a documentary checklist.",
  }),
  year: z.coerce
    .number({ message: "Enter a valid year." })
    .int("Enter a valid year.")
    .min(2000, "Year must be 2000 or later.")
    .max(2100, "Year must be 2100 or earlier."),
});

export const projectUpdateSchema = z.object({
  title: requiredText("Research Project title", 240),
  summary: z.string().trim().max(2000).optional().or(z.literal("")),
  year: z.coerce
    .number({ message: "Enter a valid year." })
    .int()
    .min(2000)
    .max(2100),
});

export const phaseSchema = z.object({
  name: requiredText("Phase name"),
  description: requiredText("Phase description", 1000),
  sequence: z.coerce.number().int().min(1, "Sequence must be at least 1.").max(50),
});

export const checklistItemSchema = z.object({
  name: requiredText("Documentary requirement", 300),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  section: z.string().trim().max(200).optional().or(z.literal("")),
  isRequired: z.boolean(),
  requiresFile: z.boolean(),
  sequence: z.coerce.number().int().min(1).max(80),
});

export const permissionUpdateSchema = z.object({
  granted: z.array(z.string()),
  revoked: z.array(z.string()),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordSchema,
});
