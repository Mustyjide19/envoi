const smartShareContract = require("../utils/smartShareContract");

describe("smartShareContract", () => {
  test("normalizes valid contract input and keeps counters ready for storage", () => {
    const expectedExpiresAt = new Date("2099-06-01T10:00").toISOString();

    const result = smartShareContract.normalizeShareContractInput(
      {
        verifiedUsersOnly: true,
        allowDownload: true,
        expiresAt: "2099-06-01T10:00",
        maxViews: "3",
        maxDownloads: "2",
      },
      new Date("2099-05-31T10:00:00.000Z").getTime()
    );

    expect(result).toEqual({
      ok: true,
      value: {
        verifiedUsersOnly: true,
        allowDownload: true,
        expiresAt: expectedExpiresAt,
        maxViews: 3,
        maxDownloads: 2,
        currentViewCount: 0,
        currentDownloadCount: 0,
        lastAccessedAt: null,
      },
    });
  });

  test("maps normalized contract fields onto the sharedFiles model", () => {
    expect(
      smartShareContract.toShareContractFields(
        {
          verifiedUsersOnly: true,
          allowDownload: false,
          expiresAt: "2099-06-01T10:00:00.000Z",
          maxViews: 5,
          maxDownloads: null,
          currentViewCount: 0,
          currentDownloadCount: 0,
          lastAccessedAt: null,
        },
        {
          currentViewCount: 2,
          currentDownloadCount: 1,
          lastAccessedAt: "2099-05-31T10:30:00.000Z",
        }
      )
    ).toEqual({
      verifiedUsersOnly: true,
      shareExpiresAt: "2099-06-01T10:00:00.000Z",
      maxViews: 5,
      maxDownloads: null,
      allowDownload: false,
      currentViewCount: 2,
      currentDownloadCount: 1,
      lastAccessedAt: "2099-05-31T10:30:00.000Z",
    });
  });

  test("blocks invalid future expiry and exhausted limits", () => {
    expect(
      smartShareContract.normalizeShareContractInput(
        { expiresAt: "2099-05-31T09:00" },
        new Date("2099-05-31T10:00:00.000Z").getTime()
      )
    ).toEqual({
      ok: false,
      code: "INVALID_EXPIRES_AT",
      message: "Enter a valid future expiry date and time.",
    });

    expect(
      smartShareContract.evaluateContractAccess({
        share: {
          allowDownload: false,
        },
        actorIsVerified: true,
        action: smartShareContract.ACTIONS.DOWNLOAD,
      })
    ).toMatchObject({
      ok: false,
      code: "SHARE_DOWNLOAD_DISABLED",
      status: 403,
    });

    expect(
      smartShareContract.evaluateContractAccess({
        share: {
          maxViews: 2,
          currentViewCount: 2,
        },
        actorIsVerified: true,
        action: smartShareContract.ACTIONS.VIEW,
      })
    ).toMatchObject({
      ok: false,
      code: "SHARE_VIEW_LIMIT_REACHED",
      status: 403,
    });
  });

  test("updates only the relevant counters for each granted action", () => {
    const viewUpdate = smartShareContract.getAccessUpdatePayload(
      {
        currentViewCount: 1,
        currentDownloadCount: 4,
      },
      smartShareContract.ACTIONS.VIEW,
      "2099-06-01T11:00:00.000Z"
    );

    const downloadUpdate = smartShareContract.getAccessUpdatePayload(
      {
        currentViewCount: 1,
        currentDownloadCount: 4,
      },
      smartShareContract.ACTIONS.DOWNLOAD,
      "2099-06-01T11:05:00.000Z"
    );

    expect(viewUpdate).toEqual({
      lastAccessedAt: "2099-06-01T11:00:00.000Z",
      currentViewCount: 2,
    });

    expect(downloadUpdate).toEqual({
      lastAccessedAt: "2099-06-01T11:05:00.000Z",
      currentDownloadCount: 5,
    });
  });
});
