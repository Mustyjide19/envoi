import { test, expect, Page } from "@playwright/test";

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          name: "E2E User",
          email: "e2e@example.com",
          image: null,
        },
        expires: "2099-12-31T23:59:59.999Z",
      }),
    });
  });
}

async function openUpload(page: Page) {
  await mockAuthenticatedSession(page);
  await page.goto("/upload");
  await expect(page.locator('input[type="file"]')).toBeAttached();
  await expect(page.getByText("Browse and select a file")).toBeVisible();
}

test("blocks wrong extension in upload UI", async ({ page }) => {
  await openUpload(page);

  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.xyz",
    mimeType: "application/pdf",
    buffer: Buffer.from("fake content"),
  });

  await expect(page.getByText("Upload Failed!")).toBeVisible();
  await expect(page.getByText("This file extension is not allowed.")).toBeVisible();
});

test("blocks wrong MIME type in upload UI", async ({ page }) => {
  await openUpload(page);

  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.pdf",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("fake content"),
  });

  await expect(page.getByText("Upload Failed!")).toBeVisible();
  await expect(page.getByText("This file type is not allowed.")).toBeVisible();
});

test("blocks suspicious executable in upload UI", async ({ page }) => {
  await openUpload(page);

  await page.locator('input[type="file"]').setInputFiles({
    name: "installer.exe",
    mimeType: "application/x-msdownload",
    buffer: Buffer.from("fake content"),
  });

  await expect(page.getByText("Upload Failed!")).toBeVisible();
  await expect(page.getByText("Executable or suspicious files are not allowed.")).toBeVisible();
});
