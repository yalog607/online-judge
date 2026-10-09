import { describe, expect, it } from "vitest";
import { directRegisterSchema } from "./schema";

const base = {
  username: "newuser",
  email: "newuser@example.com",
  password: "secret1",
  fullName: "New User",
};

describe("directRegisterSchema", () => {
  it.each(["Admin", "Teacher", "User"])("drops a client-supplied role (%s)", (role) => {
    const parsed = directRegisterSchema.parse({ ...base, role });
    expect(parsed).not.toHaveProperty("role");
  });

  it("keeps the allowed fields", () => {
    expect(directRegisterSchema.parse(base)).toEqual(base);
  });
});
