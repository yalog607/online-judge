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

describe("OTP request forms", () => {
  it("allow requesting a registration OTP before the OTP field is completed", () => {
    const html = renderToStaticMarkup(createElement(RegisterForm));

    expect(html).toContain('formNoValidate=""');
  });

  it("allow requesting a reset OTP before the OTP field is completed", () => {
    const html = renderToStaticMarkup(createElement(ForgotPasswordForm));

    expect(html).toContain('formNoValidate=""');
  });
});
