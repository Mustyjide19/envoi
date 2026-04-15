const passwordValidation = require("../utils/passwordValidation");

describe("passwordValidation utils", () => {
  test("accepts a password that matches Envoi rules", () => {
    expect(passwordValidation.isPasswordValid("ValidPass1!")).toBe(true);
    expect(passwordValidation.getPasswordValidationErrors("ValidPass1!")).toEqual([]);
  });

  test("rejects a password that misses multiple requirements", () => {
    expect(passwordValidation.getPasswordValidationErrors("short")).toEqual(
      expect.arrayContaining([
        "at least 8 characters",
        "one uppercase letter",
        "one number",
        "one special character (!@#$%^&*)",
      ])
    );
  });
});
