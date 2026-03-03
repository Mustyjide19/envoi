const { validateUploadFile } = require("../utils/fileValidation");

describe("validateUploadFile", () => {
  test("allows a valid file", () => {
    const result = validateUploadFile({
      name: "lecture-notes.pdf",
      type: "application/pdf",
      size: 1024,
    });

    expect(result).toEqual({ ok: true });
  });

  test("blocks wrong extension", () => {
    const result = validateUploadFile({
      name: "notes.pcap",
      type: "application/pdf",
      size: 1024,
    });

    expect(result).toEqual({
      ok: false,
      reason: "INVALID_EXTENSION",
      message: "This file extension is not allowed.",
    });
  });

  test("blocks wrong MIME type", () => {
    const result = validateUploadFile({
      name: "notes.pdf",
      type: "application/octet-stream",
      size: 1024,
    });

    expect(result).toEqual({
      ok: false,
      reason: "INVALID_MIME",
      message: "This file type is not allowed.",
    });
  });

  test("blocks suspicious executable files", () => {
    const result = validateUploadFile({
      name: "installer.exe",
      type: "application/x-msdownload",
      size: 1024,
    });

    expect(result).toEqual({
      ok: false,
      reason: "SUSPICIOUS_FILE",
      message: "Executable or suspicious files are not allowed.",
    });
  });

  test("accepts uppercase extension", () => {
    const result = validateUploadFile({
      name: "THESIS.PDF",
      type: "application/pdf",
      size: 1024,
    });

    expect(result).toEqual({ ok: true });
  });

  test("blocks missing extension", () => {
    const result = validateUploadFile({
      name: "README",
      type: "text/plain",
      size: 1024,
    });

    expect(result).toEqual({
      ok: false,
      reason: "MISSING_EXTENSION",
      message: "File must include a valid extension.",
    });
  });

  test("blocks empty MIME type", () => {
    const result = validateUploadFile({
      name: "notes.pdf",
      type: "",
      size: 1024,
    });

    expect(result).toEqual({
      ok: false,
      reason: "INVALID_MIME",
      message: "This file type is not allowed.",
    });
  });
});
