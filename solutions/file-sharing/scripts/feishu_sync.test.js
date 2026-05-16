const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sync = require("./feishu_sync.js");

test("parseArgs reads basic flags", () => {
  const args = sync.parseArgs([
    "--source",
    "/workspace/example-docs",
    "--notify-to",
    "ou_xxx",
    "--dry-run",
  ]);

  assert.equal(args.source, "/workspace/example-docs");
  assert.equal(args.notifyTo, "ou_xxx");
  assert.equal(args.dryRun, true);
});

test("mergeOptions lets cli args override config", () => {
  const merged = sync.mergeOptions(
    { source: "/cli/source", dryRun: true },
    { source: "/config/source", remoteRootPath: ["example_root"] }
  );

  assert.equal(merged.source, "/cli/source");
  assert.deepEqual(merged.remoteRootPath, ["example_root"]);
  assert.equal(merged.dryRun, true);
});

test("deriveRemotePathSegments preserves absolute path relative to slash", () => {
  const segments = sync.deriveRemotePathSegments("/root/projects/foo", {
    remoteRootPath: ["example_root"],
  });

  assert.deepEqual(segments, ["example_root", "root", "projects", "foo"]);
});

test("deriveRemotePathSegments allows explicit remoteFolderPath override", () => {
  const segments = sync.deriveRemotePathSegments("/root/projects/foo", {
    remoteFolderPath: ["fixed", "folder"],
  });

  assert.deepEqual(segments, ["fixed", "folder"]);
});

test("validateRemoteRootPath requires explicit remote root", () => {
  assert.throws(
    () => sync.validateRemoteRootPath({ dryRun: true }),
    /remoteRootPath is required/
  );
});

test("validateRemoteRootPath allows explicit folder token", () => {
  const warnings = sync.validateRemoteRootPath({ folderToken: "fld_xxx", dryRun: false });

  assert.deepEqual(warnings, []);
});

test("validateRemoteRootPath warns for placeholder during dry run", () => {
  const warnings = sync.validateRemoteRootPath({ remoteRootPath: ["CHANGE_ME_SERVER_NAME"], dryRun: true });

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /placeholder value/);
});

test("validateRemoteRootPath blocks placeholder during live sync", () => {
  assert.throws(
    () => sync.validateRemoteRootPath({ remoteRootPath: ["CHANGE_ME_SERVER_NAME"], dryRun: false }),
    /placeholder value/
  );
});

test("remotePathForFile previews target document path", () => {
  const remotePath = sync.remotePathForFile("/root/projects/foo/notes/a.md", "/root/projects/foo", {
    remoteRootPath: ["cloud_server_demo"],
  });

  assert.equal(remotePath, "cloud_server_demo/root/projects/foo/notes/a");
});

test("parseJsonOutput tolerates log lines before JSON", () => {
  const parsed = sync.parseJsonOutput("[info] hello\n{\"ok\":true,\"data\":{\"x\":1}}\n");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.x, 1);
});

test("collectFiles splits supported and skipped files", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "file-sharing-test-"));
  const nestedDir = path.join(tempRoot, "nested");
  fs.mkdirSync(nestedDir, { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "a.md"), "# a\n", "utf8");
  fs.writeFileSync(path.join(nestedDir, "b.txt"), "b\n", "utf8");
  fs.writeFileSync(path.join(tempRoot, "c.png"), "png", "utf8");

  const result = sync.collectFiles(tempRoot);

  assert.equal(result.supported.length, 2);
  assert.equal(result.skipped.length, 1);
  assert.ok(result.supported.some((file) => file.endsWith("a.md")));
  assert.ok(result.supported.some((file) => file.endsWith(path.join("nested", "b.txt"))));
  assert.ok(result.skipped[0].endsWith("c.png"));

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("buildSummary reports counts in dry-run mode", () => {
  const summary = sync.buildSummary(
    {
      created: [{ filePath: "/tmp/a.md", docId: "(dry-run)", remotePath: "cloud_server_demo/tmp/a" }],
      updated: [],
      unchanged: [],
      failed: [],
    },
    [],
    "/tmp",
    true,
    { remoteRootPath: ["cloud_server_demo"], warnings: ["check remote root"] }
  );

  assert.match(summary, /Feishu sync dry run complete\./);
  assert.match(summary, /Remote root: cloud_server_demo/);
  assert.match(summary, /Created: 1/);
  assert.match(summary, /Source: \/tmp/);
  assert.match(summary, /Warning: check remote root/);
  assert.match(summary, /cloud_server_demo\/tmp\/a/);
});
