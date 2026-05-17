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

test("defaults use OpenCode global runtime paths", () => {
  assert.equal(sync.DEFAULT_CONFIG_FILE, "/root/.config/opencode/cloud_server_sync/config.json");
  assert.equal(sync.DEFAULT_STATE_FILE, "/root/.local/share/opencode/cloud_server_sync/state.json");
  assert.equal(sync.DEFAULT_MANIFEST_FILE, "/root/.local/share/opencode/cloud_server_sync/manifest.json");
});

test("parseArgs accepts manifest file override", () => {
  const args = sync.parseArgs(["--source", "/tmp/source", "--manifest-file", "/tmp/manifest.json", "--allow-dangerous-source"]);

  assert.equal(args.manifestFile, "/tmp/manifest.json");
  assert.equal(args.allowDangerousSource, true);
});

test("validateSourceRoot rejects broad source roots by default", () => {
  assert.throws(() => sync.validateSourceRoot("/root"), /dangerous source root/);
  assert.equal(sync.validateSourceRoot("/root", true), "/root");
});

test("buildManifest creates cloud restore manifest from state", () => {
  const manifest = sync.buildManifest(
    {
      version: 1,
      files: {
        "/srv/demo/a.md": { docId: "doc_xxx", title: "a" },
      },
    },
    { remoteRootPath: ["cloud_server_demo"] }
  );

  assert.equal(manifest.version, 1);
  assert.deepEqual(manifest.remoteRootPath, ["cloud_server_demo"]);
  assert.equal(manifest.files["/srv/demo/a.md"].docId, "doc_xxx");
  assert.match(manifest.generatedAt, /T/);
});

test("uploadManifest uploads new manifest under remote root folder", () => {
  const calls = [];
  const result = sync.uploadManifest("/tmp/manifest.json", "fld_xxx", null, (command, args, options) => {
    calls.push({ command, args, options });
    return { stdout: '{"data":{"file_token":"box_xxx"}}', stderr: "" };
  });

  assert.equal(result.file_token, "box_xxx");
  assert.equal(calls[0].command, "lark-cli");
  assert.deepEqual(calls[0].args, ["drive", "+upload", "--file", "./manifest.json", "--name", sync.MANIFEST_FILE_NAME, "--folder-token", "fld_xxx"]);
  assert.equal(calls[0].options.cwd, "/tmp");
});

test("uploadManifest overwrites existing manifest by file token", () => {
  const calls = [];
  sync.uploadManifest("/tmp/manifest.json", "fld_xxx", "box_existing", (command, args, options) => {
    calls.push({ command, args, options });
    return { stdout: '{"data":{"file_token":"box_existing"}}', stderr: "" };
  });

  assert.equal(calls[0].args.includes("--folder-token"), false);
  assert.deepEqual(calls[0].args.slice(-2), ["--file-token", "box_existing"]);
  assert.equal(calls[0].options.cwd, "/tmp");
});

test("findFileInFolder rejects duplicate manifest files", () => {
  assert.throws(
    () => sync.findFileInFolder("fld_xxx", sync.MANIFEST_FILE_NAME, () => ({
      stdout: JSON.stringify({
        data: {
          files: [
            { type: "file", name: sync.MANIFEST_FILE_NAME, token: "box_a" },
            { type: "file", name: sync.MANIFEST_FILE_NAME, token: "box_b" },
          ],
        },
      }),
    })),
    /Multiple \.cloud_server_sync_manifest\.json files/
  );
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

test("deriveRemoteRootSegments omits source path", () => {
  const segments = sync.deriveRemoteRootSegments({ remoteRootPath: ["cloud_server_demo"] });

  assert.deepEqual(segments, ["cloud_server_demo"]);
});

test("ensureRemoteRootFolderToken creates only remote root hierarchy", () => {
  const originalEnsureFolder = sync.ensureFolder;
  const calls = [];
  sync.__setEnsureFolderForTest((parentToken, name) => {
    calls.push({ parentToken, name });
    return `token_${name}`;
  });

  try {
    const token = sync.ensureRemoteRootFolderToken({ source: "/root/projects/foo", remoteRootPath: ["cloud_server_demo"] });

    assert.equal(token, "token_cloud_server_demo");
    assert.deepEqual(calls, [{ parentToken: "", name: "cloud_server_demo" }]);
  } finally {
    sync.__setEnsureFolderForTest(originalEnsureFolder);
  }
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
