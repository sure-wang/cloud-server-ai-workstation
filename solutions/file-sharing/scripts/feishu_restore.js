#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SOLUTION_ROOT = path.resolve(__dirname, "..");
const DEFAULT_STATE_FILE = path.resolve(SOLUTION_ROOT, "data/state.json");
const DANGEROUS_RESTORE_ROOTS = new Set(["/", "/root", "/etc", "/var"]);

function printUsage() {
  console.log(`Usage: feishu_restore.js --restore-root <path> [options]\n\nOptions:\n  --restore-root <path> Restore under this local directory\n  --state-file <path>   State file path (default: ${DEFAULT_STATE_FILE})\n  --overwrite           Overwrite existing local files\n  --execute             Run export commands; default is dry-run\n  --dry-run             Preview restore actions without exporting (default)\n  -h, --help            Show this help`);
}

function parseArgs(argv) {
  const args = { stateFile: DEFAULT_STATE_FILE, dryRun: true, overwrite: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--restore-root") args.restoreRoot = argv[++i];
    else if (arg === "--state-file") args.stateFile = argv[++i];
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
  return path.isAbsolute(stateFile) ? stateFile : path.resolve(SOLUTION_ROOT, stateFile);
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
    const exists = fs.existsSync(exportPath);
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
    return { originalPath, targetPath, exportPath, docId: entry.docId, title: entry.title, action, reason };
  });
}

function exportPathForTarget(targetPath) {
  return targetPath.endsWith(".md") ? targetPath : `${targetPath}.md`;
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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

function exportDoc(item, overwrite, commandRunner = runCommand) {
  const exportPath = item.exportPath || exportPathForTarget(item.targetPath);
  ensureParentDir(exportPath);
  const outputDir = path.dirname(exportPath);
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
    path.basename(exportPath),
  ];
  if (overwrite) args.push("--overwrite");
  commandRunner("lark-cli", args, outputDir);
}

function buildSummary(results, restoreRoot, dryRun) {
  const lines = [];
  lines.push(dryRun ? "Feishu restore dry run complete." : "Feishu restore complete.");
  lines.push(`Restore root: ${restoreRoot}`);
  lines.push(`Restored: ${results.restored.length}`);
  lines.push(`Overwritten: ${results.overwritten.length}`);
  lines.push(`Skipped: ${results.skipped.length}`);
  lines.push(`Failed: ${results.failed.length}`);
  const detailLines = [];
  for (const item of results.restored) detailLines.push(`Restore: ${item.docId} -> ${item.exportPath || item.targetPath}`);
  for (const item of results.overwritten) detailLines.push(`Overwrite: ${item.docId} -> ${item.exportPath || item.targetPath}`);
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
  const results = { restored: [], overwritten: [], skipped: [], failed: [] };
  for (const item of items) {
    if (item.action === "skip") {
      results.skipped.push(item);
      continue;
    }
    try {
      if (!options.dryRun) exportDoc(item, options.overwrite);
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
  DANGEROUS_RESTORE_ROOTS,
  parseArgs,
  loadJson,
  resolveStatePath,
  validateRestoreRoot,
  targetPathForOriginal,
  exportPathForTarget,
  collectRestoreItems,
  exportDoc,
  buildSummary,
  restoreItems,
};
