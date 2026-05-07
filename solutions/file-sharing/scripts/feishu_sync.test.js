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
      created: [{ filePath: "/tmp/a.md", docId: "(dry-run)" }],
      updated: [],
      unchanged: [],
      failed: [],
    },
    [],
    "/tmp",
    true
  );

  assert.match(summary, /Feishu sync dry run complete\./);
  assert.match(summary, /Created: 1/);
  assert.match(summary, /Source: \/tmp/);
});
