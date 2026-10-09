import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "../../../app/(auth)/forgot-password/forgot-password-form";
import { RegisterForm } from "../../../app/(auth)/register/register-form";

vi.mock("@/modules/auth/actions", () => ({
  requestRegisterOtpAction: vi.fn(),
  requestResetOtpAction: vi.fn(),
  registerAction: vi.fn(),
  resetPasswordAction: vi.fn(),
}));

// Nút OTP là type="button" (không submit form) nên không reset các ô đã nhập,
// không bị validate trường OTP và không chiếm phím Enter.
function expectOtpButtonOutsideSubmit(html: string, label: string) {
  expect(html).toMatch(new RegExp(`<button type="button"[^>]*>${label}</button>`));
  expect(html.match(/type="submit"/g)).toHaveLength(1);
}

describe("OTP request forms", () => {
  it("registration OTP button does not submit the form", () => {
    expectOtpButtonOutsideSubmit(renderToStaticMarkup(createElement(RegisterForm)), "Nhận mã OTP");
  });

  it("reset OTP button does not submit the form", () => {
    expectOtpButtonOutsideSubmit(renderToStaticMarkup(createElement(ForgotPasswordForm)), "Gửi mã");
  });
});
