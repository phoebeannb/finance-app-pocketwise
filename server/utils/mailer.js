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

export async function sendPasswordResetEmail({ to, name, code }) {
  const mailer = getTransporter();
  if (!mailer) {
    if (process.env.NODE_ENV !== "production")     console.info(`Password reset code for ${to}: ${code}`);
    return false;
  }
  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your PocketWise password",
    text: `Hi ${name || "there"},\n\nYour PocketWise password reset code is ${code}. It expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(name || "there")},</p><p>Your PocketWise password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${escapeHtml(code)}</p><p>This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>`,
  });
  return true;
}
