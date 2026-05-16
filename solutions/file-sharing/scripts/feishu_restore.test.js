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
  assert.equal(args.manifestOutput, restore.DEFAULT_MANIFEST_DOWNLOAD);
});

test("parseArgs accepts cloud manifest download flags", () => {
  const args = restore.parseArgs(["--restore-root", "/tmp/restore", "--manifest-file-token", "box_xxx", "--manifest-output", "/tmp/manifest.json"]);

  assert.equal(args.manifestFileToken, "box_xxx");
  assert.equal(args.manifestOutput, "/tmp/manifest.json");
});

test("parseArgs accepts cloud manifest folder token", () => {
  const args = restore.parseArgs(["--restore-root", "/tmp/restore", "--manifest-folder-token", "https://my.feishu.cn/drive/folder/fld_xxx"]);

  assert.equal(args.manifestFolderToken, "https://my.feishu.cn/drive/folder/fld_xxx");
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

test("downloadManifest downloads file token to output path", () => {
  const calls = [];
  const output = restore.downloadManifest("box_xxx", "/tmp/manifest.json", (command, args) => {
    calls.push({ command, args });
    return { stdout: "", stderr: "" };
  });

  assert.equal(output, "/tmp/manifest.json");
  assert.deepEqual(calls[0], {
    command: "lark-cli",
    args: ["drive", "+download", "--file-token", "box_xxx", "--output", "/tmp/manifest.json", "--overwrite"],
  });
});

test("parseFolderToken extracts token from Drive folder URL", () => {
  assert.equal(restore.parseFolderToken("https://my.feishu.cn/drive/folder/fld_xxx?from=copy"), "fld_xxx");
});

test("findManifestInFolder finds manifest file by folder token", () => {
  const manifest = restore.findManifestInFolder("fld_xxx", (command, args) => {
    assert.equal(command, "lark-cli");
    assert.deepEqual(args, ["api", "GET", "/open-apis/drive/v1/files", "--params", JSON.stringify({ folder_token: "fld_xxx", page_size: 200 })]);
    return {
      stdout: JSON.stringify({
        data: {
          files: [
            { name: "notes", type: "folder", token: "folder_xxx" },
            { name: restore.MANIFEST_FILE_NAME, type: "file", token: "box_xxx", created_time: "2" },
          ],
        },
      }),
      stderr: "",
    };
  });

  assert.equal(manifest.token, "box_xxx");
});

test("downloadManifestFromFolder downloads manifest discovered in folder", () => {
  const calls = [];
  const output = restore.downloadManifestFromFolder("https://my.feishu.cn/drive/folder/fld_xxx", "/tmp/manifest.json", (command, args) => {
    calls.push({ command, args });
    if (args[0] === "api") {
      return { stdout: JSON.stringify({ data: { files: [{ name: restore.MANIFEST_FILE_NAME, type: "file", token: "box_xxx" }] } }), stderr: "" };
    }
    return { stdout: "", stderr: "" };
  });

  assert.equal(output, "/tmp/manifest.json");
  assert.deepEqual(calls[1].args, ["drive", "+download", "--file-token", "box_xxx", "--output", "/tmp/manifest.json", "--overwrite"]);
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

test("collectRestoreItems skips when fallback markdown export already exists", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "restore-test-"));
  const fallback = path.join(tempRoot, "srv/demo/a.txt.md");
  fs.mkdirSync(path.dirname(fallback), { recursive: true });
  fs.writeFileSync(fallback, "existing fallback", "utf8");

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

  assert.equal(items[0].action, "skip");
  assert.equal(items[0].reason, "target exists");

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
