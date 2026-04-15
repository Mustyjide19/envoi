const authRedirect = require("../utils/authRedirect");

describe("authRedirect utils", () => {
  test("keeps safe relative callback paths", () => {
    expect(
      authRedirect.sanitizeRelativeRedirectPath("/shared-files/abc123")
    ).toBe("/shared-files/abc123");
  });

  test("rejects unsafe callback values", () => {
    expect(
      authRedirect.sanitizeRelativeRedirectPath(
        "https://malicious.example",
        "/dashboard"
      )
    ).toBe("/dashboard");
    expect(
      authRedirect.sanitizeRelativeRedirectPath("//malicious.example", "/dashboard")
    ).toBe("/dashboard");
  });

  test("buildAuthPageHref appends callbackUrl when present", () => {
    expect(
      authRedirect.buildAuthPageHref("/sign-in", "/file-view/abc123")
    ).toBe("/sign-in?callbackUrl=%2Ffile-view%2Fabc123");
  });
});
