const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const restore = require("./feishu_restore.js");

test("parseArgs defaults to dry run", () => {
  const args = restore.parseArgs(["--restore-root", "/tmp/restore"]);

  assert.equal(args.restoreRoot, "/tmp/restore");
  assert.equal(args.dryRun, true);
  assert.equal(args.overwrite, false);
});

test("parseArgs enables execution and overwrite", () => {
  const args = restore.parseArgs(["--restore-root", "/tmp/restore", "--execute", "--overwrite"]);

  assert.equal(args.dryRun, false);
  assert.equal(args.overwrite, true);
});

test("validateRestoreRoot rejects dangerous roots", () => {
  assert.throws(() => restore.validateRestoreRoot("/"), /dangerous restore root/);
  assert.throws(() => restore.validateRestoreRoot("/root"), /dangerous restore root/);
});

test("targetPathForOriginal preserves absolute path below restore root", () => {
  const target = restore.targetPathForOriginal("/srv/demo/notes/a.md", "/tmp/restore");

  assert.equal(target, path.resolve("/tmp/restore/srv/demo/notes/a.md"));
});

test("exportPathForTarget keeps markdown targets unchanged", () => {
  assert.equal(restore.exportPathForTarget("/tmp/restore/a.md"), "/tmp/restore/a.md");
});

test("exportPathForTarget preserves non-markdown target names", () => {
  assert.equal(restore.exportPathForTarget("/tmp/restore/checklist.txt"), "/tmp/restore/checklist.txt");
});

test("fallbackExportPathForTarget captures lark markdown suffix behavior", () => {
  assert.equal(restore.fallbackExportPathForTarget("/tmp/restore/checklist.txt"), "/tmp/restore/checklist.txt.md");
});

test("collectRestoreItems marks existing targets as skipped by default", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "restore-test-"));
  const target = path.join(tempRoot, "srv/demo/a.txt");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "existing", "utf8");

  const items = restore.collectRestoreItems(
    {
      version: 1,
      files: {
        "/srv/demo/a.txt": { docId: "doc_xxx", title: "a" },
      },
    },
    tempRoot,
    false
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].action, "skip");
  assert.equal(items[0].reason, "target exists");
  assert.equal(items[0].exportPath, target);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("collectRestoreItems marks existing targets for overwrite when requested", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "restore-test-"));
  const target = path.join(tempRoot, "srv/demo/a.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "existing", "utf8");

  const items = restore.collectRestoreItems(
    {
      version: 1,
      files: {
        "/srv/demo/a.md": { docId: "doc_xxx", title: "a" },
      },
    },
    tempRoot,
    true
  );

  assert.equal(items[0].action, "overwrite");

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("restoreItems does not call export during dry run", () => {
  const results = restore.restoreItems(
    [{ originalPath: "/srv/demo/a.md", targetPath: "/tmp/restore/srv/demo/a.md", docId: "doc_xxx", action: "restore" }],
    { dryRun: true, overwrite: false }
  );

  assert.equal(results.restored.length, 1);
  assert.equal(results.failed.length, 0);
});

test("exportDoc runs lark export from target directory with relative output", () => {
  const calls = [];
  restore.exportDoc(
    {
      docId: "doc_xxx",
      targetPath: "/tmp/restore/root/demo/checklist.txt",
      exportPath: "/tmp/restore/root/demo/checklist.txt.md",
    },
    false,
    (command, args, cwd) => {
      calls.push({ command, args, cwd });
      return { stdout: "", stderr: "" };
    }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "lark-cli");
  assert.equal(calls[0].cwd, "/tmp/restore/root/demo");
  assert.deepEqual(calls[0].args.slice(0, 8), ["drive", "+export", "--doc-type", "docx", "--file-extension", "markdown", "--token", "doc_xxx"]);
  assert.equal(calls[0].args[calls[0].args.indexOf("--output-dir") + 1], ".");
  assert.equal(calls[0].args[calls[0].args.indexOf("--file-name") + 1], "checklist.txt");
});

test("exportDoc renames lark markdown suffix back to target path", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "restore-export-test-"));
  const targetPath = path.join(tempRoot, "checklist.txt");

  const item = {
    docId: "doc_xxx",
    targetPath,
    exportPath: targetPath,
  };

  restore.exportDoc(item, false, () => {
    fs.writeFileSync(`${targetPath}.md`, "exported", "utf8");
    return { stdout: "", stderr: "" };
  });

  assert.equal(item.exportPath, targetPath);
  assert.equal(fs.existsSync(targetPath), true);
  assert.equal(fs.existsSync(`${targetPath}.md`), false);
  assert.equal(fs.readFileSync(targetPath, "utf8"), "exported");

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("buildSummary reports restore actions", () => {
  const summary = restore.buildSummary(
    {
      restored: [{ docId: "doc_xxx", targetPath: "/tmp/restore/a.txt", exportPath: "/tmp/restore/a.txt" }],
      overwritten: [],
      skipped: [{ originalPath: "/srv/b.md", reason: "target exists" }],
      failed: [],
    },
    "/tmp/restore",
    true
  );

  assert.match(summary, /Feishu restore dry run complete\./);
  assert.match(summary, /Restore root: \/tmp\/restore/);
  assert.match(summary, /Restored: 1/);
  assert.match(summary, /Skipped: 1/);
  assert.match(summary, /doc_xxx -> \/tmp\/restore\/a\.txt/);
});
