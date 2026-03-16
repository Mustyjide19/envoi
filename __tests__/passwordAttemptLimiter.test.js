const passwordAttemptLimiter = require("../utils/passwordAttemptLimiter");

describe("passwordAttemptLimiter", () => {
  test("does not block before max failed attempts", () => {
    const result = passwordAttemptLimiter.getFailedAttemptUpdate(3, 0);

    expect(result.blocked).toBe(false);
    expect(result.failedAttempts).toBe(4);
    expect(result.lockedUntil).toBeNull();
    expect(result.message).toBe("Incorrect password. Please try again.");
  });

  test("blocks on the fifth failed attempt", () => {
    const result = passwordAttemptLimiter.getFailedAttemptUpdate(4, 0);

    expect(result.blocked).toBe(true);
    expect(result.failedAttempts).toBe(5);
    expect(result.lockedUntil).toBe("1970-01-01T00:10:00.000Z");
    expect(result.message).toBe("Too many failed attempts. Try again in 10 minutes.");
  });

  test("detects active lock windows", () => {
    expect(
      passwordAttemptLimiter.isLocked("1970-01-01T00:10:00.000Z", 1)
    ).toBe(true);
    expect(
      passwordAttemptLimiter.isLocked("1970-01-01T00:10:00.000Z", 600000)
    ).toBe(false);
  });

  test("resets attempt state on success", () => {
    expect(passwordAttemptLimiter.getSuccessfulAttemptReset()).toEqual({
      failedAttempts: 0,
      lockedUntil: null,
    });
  });
});
