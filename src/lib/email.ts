import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

type NoticeInput = {
  recipientUserId: string;
  recipientEmail: string;
  projectId?: string | null;
  subject: string;
  body: string;
};

export async function sendResearcherNotice(input: NoticeInput) {
  const host = process.env.SMTP_HOST?.trim();
  let status: "SENT" | "LOGGED" | "FAILED" = "LOGGED";

  if (host) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "Research and Development Unit <noreply@rdu.local>",
        to: input.recipientEmail,
        subject: input.subject,
        text: input.body,
      });
      status = "SENT";
    } catch (error) {
      console.error("Email delivery failed", error);
      status = "FAILED";
    }
  }

  return prisma.emailNotice.create({
    data: {
      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      projectId: input.projectId ?? null,
      subject: input.subject,
      body: input.body,
      status,
    },
  });
}
