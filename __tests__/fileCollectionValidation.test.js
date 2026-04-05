const {
  normalizeOrderedItems,
  validateFileCollectionInput,
} = require("../utils/fileCollectionValidation");

describe("fileCollectionValidation", () => {
  test("normalizes ordered items and removes duplicates", () => {
    expect(
      normalizeOrderedItems([
        { fileId: "file_a", order: 99 },
        { fileId: "file_b" },
        { fileId: "file_a" },
        "",
      ])
    ).toEqual([
      { fileId: "file_a", order: 0 },
      { fileId: "file_b", order: 1 },
    ]);
  });

  test("requires a title", () => {
    expect(
      validateFileCollectionInput({
        title: " ",
        orderedItems: [{ fileId: "file_1" }],
      })
    ).toEqual({
      ok: false,
      code: "TITLE_REQUIRED",
      message: "Collection title is required.",
    });
  });

  test("requires at least one file", () => {
    expect(
      validateFileCollectionInput({
        title: "Data Mining Lab Files",
        orderedItems: [],
      })
    ).toEqual({
      ok: false,
      code: "FILES_REQUIRED",
      message: "Select at least one file for this collection.",
    });
  });

  test("returns normalized collection payload", () => {
    expect(
      validateFileCollectionInput({
        title: "  SQL Injection Notes Bundle  ",
        description: "  Useful notes  ",
        moduleLabel: "  CSC401  ",
        tags: ["sql", " revision ", "sql", ""],
        orderedItems: [{ fileId: "file_2" }, { fileId: "file_1" }],
      })
    ).toEqual({
      ok: true,
      value: {
        title: "SQL Injection Notes Bundle",
        description: "Useful notes",
        moduleLabel: "CSC401",
        tags: ["sql", "revision"],
        orderedItems: [
          { fileId: "file_2", order: 0 },
          { fileId: "file_1", order: 1 },
        ],
        fileIds: ["file_2", "file_1"],
        fileCount: 2,
      },
    });
  });
});
