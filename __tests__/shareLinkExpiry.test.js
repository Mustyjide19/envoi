const shareLinkExpiry = require("../utils/shareLinkExpiry");

describe("shareLinkExpiry", () => {
  test("clears expiry when no option is selected", () => {
    expect(shareLinkExpiry.resolveShareLinkExpiry("", 0)).toEqual({
      linkExpiryOption: "",
      linkExpiresAt: null,
    });
  });

  test("calculates one-hour expiry", () => {
    expect(
      shareLinkExpiry.resolveShareLinkExpiry(
        shareLinkExpiry.SHARE_LINK_EXPIRY_OPTIONS.ONE_HOUR,
        0
      )
    ).toEqual({
      linkExpiryOption: "1h",
      linkExpiresAt: "1970-01-01T01:00:00.000Z",
    });
  });

  test("detects expired links", () => {
    expect(
      shareLinkExpiry.isShareLinkExpired("1970-01-01T01:00:00.000Z", 3600000)
    ).toBe(true);
    expect(
      shareLinkExpiry.isShareLinkExpired("1970-01-01T01:00:00.000Z", 3599999)
    ).toBe(false);
  });
});
