import { describe, expect, it } from "vitest";
import {
  adminListUsersQuerySchema,
  directRegisterSchema,
  setUserRoleSchema,
  setUserStatusSchema,
} from "./schema";

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

describe("adminListUsersQuerySchema", () => {
  it("defaults page to 1 and pageSize to 20", () => {
    const parsed = adminListUsersQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it("accepts valid filters", () => {
    const parsed = adminListUsersQuerySchema.parse({
      q: "  john  ",
      role: "Teacher",
      status: "Active",
      page: "2",
      pageSize: "50",
    });
    expect(parsed.q).toBe("john");
    expect(parsed.role).toBe("Teacher");
    expect(parsed.status).toBe("Active");
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(50);
  });

  it("rejects invalid role or status", () => {
    expect(() => adminListUsersQuerySchema.parse({ role: "SuperAdmin" })).toThrow();
    expect(() => adminListUsersQuerySchema.parse({ status: "Banned" })).toThrow();
  });
});

describe("setUserStatusSchema", () => {
  it("accepts valid userId and status", () => {
    const parsed = setUserStatusSchema.parse({ userId: "42", status: "Locked" });
    expect(parsed.userId).toBe(42);
    expect(parsed.status).toBe("Locked");
  });

  it("rejects non-positive userId or invalid status", () => {
    expect(() => setUserStatusSchema.parse({ userId: 0, status: "Active" })).toThrow();
    expect(() => setUserStatusSchema.parse({ userId: 5, status: "Unknown" })).toThrow();
  });
});

describe("setUserRoleSchema", () => {
  it.each(["User", "TA", "Teacher"])("accepts valid role %s", (role) => {
    const parsed = setUserRoleSchema.parse({ userId: "10", role });
    expect(parsed.userId).toBe(10);
    expect(parsed.role).toBe(role);
  });

  it("rejects invalid role or non-positive userId", () => {
    expect(() => setUserRoleSchema.parse({ userId: 10, role: "SuperAdmin" })).toThrow();
    expect(() => setUserRoleSchema.parse({ userId: -1, role: "TA" })).toThrow();
    expect(() => setUserRoleSchema.parse({ userId: 0, role: "Teacher" })).toThrow();
  });
});


