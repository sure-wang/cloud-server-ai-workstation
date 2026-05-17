#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const RUNTIME_DATA_DIR = path.join(os.homedir(), ".local", "share", "opencode", "cloud_server_sync");
const DEFAULT_STATE_FILE = path.join(RUNTIME_DATA_DIR, "state.json");
const MANIFEST_FILE_NAME = ".cloud_server_sync_manifest.json";
const DEFAULT_MANIFEST_DOWNLOAD = path.join(RUNTIME_DATA_DIR, "manifest.json");
const DANGEROUS_RESTORE_ROOTS = new Set(["/", "/root", "/etc", "/var"]);

function printUsage() {
  console.log(`Usage: feishu_restore.js --restore-root <path> [options]\n\nOptions:\n  --restore-root <path>         Restore under this local directory\n  --state-file <path>           State file path (default: ${DEFAULT_STATE_FILE})\n  --manifest-file-token <id>    Download cloud manifest file before restore\n  --manifest-folder-token <id>  Find and download manifest from a Drive folder token or URL\n  --manifest-output <path>      Downloaded manifest path (default: ${DEFAULT_MANIFEST_DOWNLOAD})\n  --normalize-export            Best-effort cleanup of Feishu Markdown export quirks\n  --overwrite                   Overwrite existing local files\n  --execute                     Run export commands; default is dry-run\n  --dry-run                     Preview restore actions without exporting (default)\n  -h, --help                    Show this help`);
}

function parseArgs(argv) {
  const args = { stateFile: DEFAULT_STATE_FILE, manifestOutput: DEFAULT_MANIFEST_DOWNLOAD, dryRun: true, overwrite: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--restore-root") args.restoreRoot = argv[++i];
    else if (arg === "--state-file") args.stateFile = argv[++i];
    else if (arg === "--manifest-file-token") args.manifestFileToken = argv[++i];
    else if (arg === "--manifest-folder-token") args.manifestFolderToken = argv[++i];
    else if (arg === "--manifest-output") args.manifestOutput = argv[++i];
    else if (arg === "--normalize-export") args.normalizeExport = true;
    else if (arg === "--overwrite") args.overwrite = true;
    else if (arg === "--execute") args.dryRun = false;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "-h" || arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`State file does not exist: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

function resolveStatePath(stateFile) {
  return path.isAbsolute(stateFile) ? stateFile : path.resolve(stateFile);
}

function resolveManifestOutput(manifestOutput) {
  return path.isAbsolute(manifestOutput) ? manifestOutput : path.resolve(manifestOutput);
}

function validateRestoreRoot(restoreRoot) {
  if (!restoreRoot) throw new Error("--restore-root is required");
  const resolved = path.resolve(restoreRoot);
  if (DANGEROUS_RESTORE_ROOTS.has(resolved)) {
    throw new Error(`Refusing dangerous restore root: ${resolved}`);
  }
  return resolved;
}

function targetPathForOriginal(originalPath, restoreRoot) {
  const resolvedOriginal = path.resolve(originalPath);
  const relativeOriginal = resolvedOriginal.split(path.sep).filter(Boolean).join(path.sep);
  const targetPath = path.resolve(restoreRoot, relativeOriginal);
  const relativeTarget = path.relative(restoreRoot, targetPath);
  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    throw new Error(`Refusing restore target outside restore root: ${targetPath}`);
  }
  return targetPath;
}

function collectRestoreItems(state, restoreRoot, overwrite) {
  const files = state.files || {};
  return Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([originalPath, entry]) => {
    const targetPath = targetPathForOriginal(originalPath, restoreRoot);
    const exportPath = exportPathForTarget(targetPath);
    const fallbackExportPath = fallbackExportPathForTarget(targetPath);
    const exists = fs.existsSync(targetPath) || (fallbackExportPath !== targetPath && fs.existsSync(fallbackExportPath));
    let action = "restore";
    let reason = "";
    if (!entry.docId) {
      action = "skip";
      reason = "missing docId";
    } else if (exists && !overwrite) {
      action = "skip";
      reason = "target exists";
    } else if (exists && overwrite) {
      action = "overwrite";
    }
    return { originalPath, targetPath, exportPath, fallbackExportPath, docId: entry.docId, title: entry.title, checksum: entry.checksum, action, reason };
  });
}

function exportPathForTarget(targetPath) {
  return targetPath;
}

function fallbackExportPathForTarget(targetPath) {
  return targetPath.endsWith(".md") ? targetPath : `${targetPath}.md`;
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function runCommand(command, commandArgs, cwd) {
  const options = {
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  };
  if (cwd) options.cwd = cwd;
  const result = spawnSync(command, commandArgs, options);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(stderr || stdout || `${command} exited with code ${result.status}`);
  }
  return { stdout: (result.stdout || "").trim(), stderr: (result.stderr || "").trim() };
}

function parseFolderToken(value) {
  if (!value) throw new Error("--manifest-folder-token is required");
  const match = String(value).match(/\/drive\/folder\/([^/?#]+)/);
  return match ? match[1] : value;
}

function parseJsonOutput(output) {
  if (!output) throw new Error("Command returned empty JSON output");
  try {
    return JSON.parse(output);
  } catch (error) {
    const firstObjectIndex = output.indexOf("{");
    if (firstObjectIndex >= 0) {
      try {
        return JSON.parse(output.slice(firstObjectIndex).trim());
      } catch {}
    }
    throw new Error(`Failed to parse JSON output: ${error.message}\n${output}`);
  }
}

function listFolderItems(folderToken, commandRunner = runCommand) {
  const params = JSON.stringify({ folder_token: parseFolderToken(folderToken), page_size: 200 });
  const { stdout } = commandRunner("lark-cli", ["api", "GET", "/open-apis/drive/v1/files", "--params", params]);
  const parsed = parseJsonOutput(stdout);
  return parsed.data?.files || [];
}

function findManifestInFolder(folderToken, commandRunner = runCommand) {
  const items = listFolderItems(folderToken, commandRunner);
  return items.filter((item) => item.type === "file" && item.name === MANIFEST_FILE_NAME).sort((a, b) => Number(a.created_time || 0) - Number(b.created_time || 0))[0] || null;
}

function downloadManifest(fileToken, outputPath, commandRunner = runCommand) {
  if (!fileToken) throw new Error("--manifest-file-token is required to download a cloud manifest");
  ensureParentDir(outputPath);
  commandRunner("lark-cli", ["drive", "+download", "--file-token", fileToken, "--output", `./${path.basename(outputPath)}`, "--overwrite"], path.dirname(outputPath));
  return outputPath;
}

function downloadManifestFromFolder(folderToken, outputPath, commandRunner = runCommand) {
  const manifest = findManifestInFolder(folderToken, commandRunner);
  if (!manifest?.token) throw new Error(`No ${MANIFEST_FILE_NAME} found in folder ${parseFolderToken(folderToken)}`);
  return downloadManifest(manifest.token, outputPath, commandRunner);
}

function fixExportSuffix(outputDir, expectPath, fallbackPath) {
  if (fs.existsSync(expectPath)) return expectPath;
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    fs.renameSync(fallbackPath, expectPath);
    return expectPath;
  }
  return null;
}

function normalizeExportedMarkdown(filePath, title) {
  if (!fs.existsSync(filePath)) return false;
  const original = fs.readFileSync(filePath, "utf8");
  let normalized = original;
  if (title) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(new RegExp(`^# ${escapedTitle}\\r?\\n\\r?\\n`), "");
  }
  normalized = normalized.replace(/\\([-.])/g, "$1");
  if (normalized === original) return false;
  fs.writeFileSync(filePath, normalized, "utf8");
  return true;
}

function verifyRestoredChecksum(item) {
  if (!item.checksum || !item.exportPath || !fs.existsSync(item.exportPath)) return null;
  const actual = sha256(item.exportPath);
  const ok = actual === item.checksum;
  item.checksumActual = actual;
  item.checksumExpected = item.checksum;
  item.checksumOk = ok;
  return ok;
}

function exportDoc(item, overwrite, optionsOrCommandRunner = {}, maybeCommandRunner) {
  const options = typeof optionsOrCommandRunner === "function" ? {} : optionsOrCommandRunner;
  const commandRunner = typeof optionsOrCommandRunner === "function" ? optionsOrCommandRunner : options.commandRunner || maybeCommandRunner || runCommand;
  const targetPath = item.targetPath;
  ensureParentDir(targetPath);
  const outputDir = path.dirname(targetPath);
  const targetName = path.basename(targetPath);
  const args = [
    "drive",
    "+export",
    "--doc-type",
    "docx",
    "--file-extension",
    "markdown",
    "--token",
    item.docId,
    "--output-dir",
    ".",
    "--file-name",
    targetName,
  ];
  if (overwrite) args.push("--overwrite");
  commandRunner("lark-cli", args, outputDir);
  const finalPath = fixExportSuffix(outputDir, targetPath, item.fallbackExportPath || fallbackExportPathForTarget(targetPath));
  if (finalPath) {
    item.exportPath = finalPath;
  } else {
    const exportPath = item.exportPath || exportPathForTarget(item.targetPath);
    if (fs.existsSync(exportPath)) {
      item.exportPath = exportPath;
    }
  }
  if (options.normalizeExport && item.exportPath) item.normalized = normalizeExportedMarkdown(item.exportPath, item.title);
  verifyRestoredChecksum(item);
}

function buildSummary(results, restoreRoot, dryRun) {
  const lines = [];
  lines.push(dryRun ? "Feishu restore dry run complete." : "Feishu restore complete.");
  lines.push(`Restore root: ${restoreRoot}`);
  lines.push(`Restored: ${results.restored.length}`);
  lines.push(`Overwritten: ${results.overwritten.length}`);
  lines.push(`Skipped: ${results.skipped.length}`);
  lines.push(`Failed: ${results.failed.length}`);
  if (!dryRun) {
    lines.push(`Checksum matched: ${results.checksumMatched.length}`);
    lines.push(`Checksum mismatched: ${results.checksumMismatched.length}`);
  }
  const detailLines = [];
  for (const item of results.restored) detailLines.push(`Restore: ${item.docId} -> ${item.exportPath || item.targetPath}`);
  for (const item of results.overwritten) detailLines.push(`Overwrite: ${item.docId} -> ${item.exportPath || item.targetPath}`);
  for (const item of results.checksumMismatched) detailLines.push(`Checksum mismatch: ${item.originalPath} expected ${item.checksumExpected} got ${item.checksumActual}`);
  for (const item of results.skipped) detailLines.push(`Skip: ${item.originalPath} -> ${item.reason}`);
  for (const item of results.failed) detailLines.push(`Failed: ${item.originalPath} -> ${item.error}`);
  if (detailLines.length > 30) {
    detailLines.length = 30;
    detailLines.push("Details truncated to keep the output small.");
  }
  if (detailLines.length > 0) {
    lines.push("");
    lines.push(...detailLines);
  }
  return lines.join("\n");
}

function restoreItems(items, options) {
  const results = { restored: [], overwritten: [], skipped: [], failed: [], checksumMatched: [], checksumMismatched: [] };
  for (const item of items) {
    if (item.action === "skip") {
      results.skipped.push(item);
      continue;
    }
    try {
      if (!options.dryRun) {
        exportDoc(item, options.overwrite, options);
        if (item.checksumOk === true) results.checksumMatched.push(item);
        else if (item.checksumOk === false) results.checksumMismatched.push(item);
      }
      if (item.action === "overwrite") results.overwritten.push(item);
      else results.restored.push(item);
    } catch (error) {
      results.failed.push({ ...item, error: error.message });
    }
  }
  return results;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printUsage();
  options.manifestOutput = resolveManifestOutput(options.manifestOutput);
  if (options.manifestFileToken && options.manifestFolderToken) throw new Error("Use either --manifest-file-token or --manifest-folder-token, not both");
  if (options.manifestFolderToken) {
    downloadManifestFromFolder(options.manifestFolderToken, options.manifestOutput);
    options.stateFile = options.manifestOutput;
  } else if (options.manifestFileToken) {
    downloadManifest(options.manifestFileToken, options.manifestOutput);
    options.stateFile = options.manifestOutput;
  }
  options.stateFile = resolveStatePath(options.stateFile);
  options.restoreRoot = validateRestoreRoot(options.restoreRoot);
  const state = loadJson(options.stateFile);
  const items = collectRestoreItems(state, options.restoreRoot, options.overwrite);
  const results = restoreItems(items, options);
  console.log(buildSummary(results, options.restoreRoot, options.dryRun));
  if (results.failed.length > 0) process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_STATE_FILE,
  MANIFEST_FILE_NAME,
  DEFAULT_MANIFEST_DOWNLOAD,
  DANGEROUS_RESTORE_ROOTS,
  parseArgs,
  loadJson,
  resolveStatePath,
  resolveManifestOutput,
  validateRestoreRoot,
  targetPathForOriginal,
  exportPathForTarget,
  fallbackExportPathForTarget,
  sha256,
  parseFolderToken,
  parseJsonOutput,
  listFolderItems,
  findManifestInFolder,
  downloadManifest,
  downloadManifestFromFolder,
  collectRestoreItems,
  normalizeExportedMarkdown,
  verifyRestoredChecksum,
  exportDoc,
  buildSummary,
  restoreItems,
};
