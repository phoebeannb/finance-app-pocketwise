import nodemailer from "nodemailer";

let transporter;
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendPasswordResetEmail({ to, name, link }) {
  const mailer = getTransporter();
  if (!mailer) {
    if (process.env.NODE_ENV !== "production") console.info(`Password reset link for ${to}: ${link}`);
    return false;
  }
  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your PocketWise password",
    text: `Hi ${name || "there"},\n\nUse this link to reset your PocketWise password. It expires in 15 minutes:\n${link}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(name || "there")},</p><p>Use the button below to reset your PocketWise password. This link expires in 15 minutes.</p><p><a href="${escapeHtml(link)}">Reset my password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
  return true;
}
