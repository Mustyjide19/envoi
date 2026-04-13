const fileSecurityCenter = require("../utils/fileSecurityCenter");

describe("fileSecurityCenter", () => {
  test("keeps a protected file in a safe state when recent activity is quiet", () => {
    const result = fileSecurityCenter.evaluateFileSecurityCenter({
      file: {
        id: "file_1",
        userEmail: "owner@example.com",
        password: "secret",
        linkExpiresAt: "2099-06-01T12:00:00.000Z",
      },
      accessLogs: [
        {
          fileId: "file_1",
          actorEmail: "owner@example.com",
          action: "UPLOAD",
          timestamp: "2099-05-31T10:00:00.000Z",
        },
      ],
      securityEvents: [],
      shares: [
        {
          id: "share_1",
          recipientEmail: "friend@example.com",
          verifiedUsersOnly: true,
          allowDownload: false,
          maxViews: 3,
          shareExpiresAt: "2099-06-01T11:00:00.000Z",
          sharedAt: "2099-05-31T09:30:00.000Z",
        },
      ],
      now: new Date("2099-05-31T10:30:00.000Z").getTime(),
    });

    expect(result.riskStatus).toBe("SAFE");
    expect(result.securityScore).toBeGreaterThanOrEqual(70);
    expect(result.activeDirectShareCount).toBe(1);
    expect(result.collectionShareCount).toBe(0);
  });

  test("raises high risk when failed unlock attempts repeat in a short window", () => {
    const now = new Date("2099-05-31T10:30:00.000Z").getTime();

    const result = fileSecurityCenter.evaluateFileSecurityCenter({
      file: {
        id: "file_1",
        userEmail: "owner@example.com",
      },
      accessLogs: [],
      securityEvents: Array.from({ length: 5 }, (_, index) => ({
        eventType: "PASSWORD_FAILED",
        timestamp: new Date(now - index * 2 * 60 * 1000).toISOString(),
      })),
      shares: [],
      now,
    });

    expect(result.riskStatus).toBe("HIGH_RISK");
    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "failed-unlocks-high",
          severity: "high",
        }),
      ])
    );
  });

  test("separates collection-derived shares from direct shares and surfaces contract activity", () => {
    const now = new Date("2099-05-31T10:30:00.000Z").getTime();

    const result = fileSecurityCenter.evaluateFileSecurityCenter({
      file: {
        id: "file_1",
        userEmail: "owner@example.com",
      },
      accessLogs: [
        {
          fileId: "file_1",
          actorEmail: "recipient@example.com",
          action: "DOWNLOAD",
          timestamp: "2099-05-31T10:25:00.000Z",
        },
      ],
      securityEvents: [
        {
          fileId: "file_1",
          eventType: "CONTRACT_RULE_VIOLATION",
          timestamp: "2099-05-31T10:20:00.000Z",
          reasonCode: "SHARE_DOWNLOAD_LIMIT_REACHED",
          message: "This share has reached its maximum number of downloads.",
          severity: "warning",
        },
      ],
      shares: [
        {
          id: "direct_1",
          recipientEmail: "recipient@example.com",
          allowDownload: true,
          sharedAt: "2099-05-31T09:00:00.000Z",
        },
        {
          id: "collection_1",
          recipientEmail: "recipient@example.com",
          collectionShareId: "collection_abc",
          sharedAt: "2099-05-31T08:00:00.000Z",
        },
      ],
      now,
    });

    expect(result.activeDirectShareCount).toBe(1);
    expect(result.collectionShareCount).toBe(1);
    expect(result.timeline[0]).toEqual(
      expect.objectContaining({
        title: "Download granted",
      })
    );
    expect(result.metrics.contractViolations30m).toBe(1);
  });
});
