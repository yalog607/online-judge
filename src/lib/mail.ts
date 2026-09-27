import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

function getTransporter() {
  const e = env();
  transporter ??= nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export async function sendOtpMail(to: string, code: string, purpose: "Register" | "Reset") {
  const subject =
    purpose === "Register" ? "Mã xác thực đăng ký ITOJ" : "Mã xác thực khôi phục mật khẩu ITOJ";
  await getTransporter().sendMail({
    from: env().MAIL_FROM,
    to,
    subject,
    text: `Mã xác thực của bạn là: ${code}. Mã có hiệu lực trong 5 phút.`,
  });
}
