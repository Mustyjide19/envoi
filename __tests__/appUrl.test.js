const appUrl = require("../utils/appUrl");

describe("appUrl", () => {
  test("prefers NEXT_PUBLIC_APP_URL over APP_URL on the server", () => {
    expect(
      appUrl.getServerAppUrl({
        NEXT_PUBLIC_APP_URL: "https://www.envoi.website/",
        APP_URL: "http://localhost:3000",
      })
    ).toBe("https://www.envoi.website");
  });

  test("uses the current browser origin on the client when available", () => {
    expect(
      appUrl.getClientAppUrl(
        { NEXT_PUBLIC_APP_URL: "https://www.envoi.website" },
        "http://localhost:3000"
      )
    ).toBe("http://localhost:3000");
  });

  test("repairs stored localhost short URLs for the current origin", () => {
    expect(
      appUrl.resolveDisplayedShortUrl({
        storedUrl: "http://localhost:3000/abc123",
        fileId: "abc123",
        currentOrigin: "https://www.envoi.website",
      })
    ).toBe("https://www.envoi.website/abc123");
  });

  test("builds verification URLs with optional returnTo", () => {
    expect(
      appUrl.buildVerificationUrl(
        "verify-token",
        "https://www.envoi.website",
        "/shared-files/abc123"
      )
    ).toBe(
      "https://www.envoi.website/verify?token=verify-token&returnTo=%2Fshared-files%2Fabc123"
    );
  });
});
