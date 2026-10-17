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

const OTP_TTL_MINUTES = 5;

// Màu lấy từ token của giao diện (app/globals.css); email chỉ dùng inline style để tương thích mail client.
function renderOtpHtml(code: string, heading: string, intro: string) {
  // Cả mã nằm trong một ô, một nút văn bản liền mạch: chạm/nhấp đúp là chọn đủ 6 số.
  const codeBox = `<span style="display:inline-block;padding:14px 28px;background:#ede9fe;border:1px solid #ddd6fe;border-radius:12px;font:700 34px 'Courier New',monospace;letter-spacing:10px;text-indent:10px;color:#5b21b6;-webkit-user-select:all;user-select:all;">${code}</span>`;
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Mã xác thực ITOJ của bạn là ${code}. Có hiệu lực trong ${OTP_TTL_MINUTES} phút.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:0 4px 16px;font-size:20px;font-weight:800;letter-spacing:-0.3px;color:#5b21b6;">&lt;/&gt; ITOJ</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececef;border-radius:14px;padding:32px 28px;">
<h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0b0f19;">${heading}</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b7280;">${intro}</p>
<div style="margin:0 0 24px;text-align:center;">${codeBox}</div>
<p style="margin:0 0 20px;text-align:center;font-size:13px;color:#b45309;background:#fef3c7;border-radius:8px;padding:10px 12px;">Mã có hiệu lực trong <b>${OTP_TTL_MINUTES} phút</b>.</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">Vì lý do bảo mật, tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả người tự nhận là ITOJ. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
</td></tr>
<tr><td style="padding:16px 4px 0;text-align:center;font-size:12px;color:#9ca3af;">Email tự động từ ITOJ – hệ thống chấm bài lập trình trực tuyến. Vui lòng không trả lời email này.</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function sendOtpMail(to: string, code: string, purpose: "Register" | "Reset") {
  const isRegister = purpose === "Register";
  const subject = isRegister ? "Mã xác thực đăng ký ITOJ" : "Mã xác thực khôi phục mật khẩu ITOJ";
  const heading = isRegister ? "Xác thực đăng ký tài khoản" : "Khôi phục mật khẩu";
  const intro = isRegister
    ? "Chào mừng bạn đến với ITOJ! Nhập mã dưới đây để hoàn tất đăng ký tài khoản."
    : "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhập mã dưới đây để tiếp tục.";
  await getTransporter().sendMail({
    from: env().MAIL_FROM,
    to,
    subject,
    text: `${heading} ITOJ\n\nMã xác thực của bạn là: ${code}\nMã có hiệu lực trong ${OTP_TTL_MINUTES} phút. Không chia sẻ mã này cho bất kỳ ai.`,
    html: renderOtpHtml(code, heading, intro),
  });
}
