#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const SOLUTION_ROOT = path.resolve(__dirname, "..");
const RUNTIME_CONFIG_DIR = path.join(os.homedir(), ".config", "opencode", "cloud_server_sync");
const RUNTIME_DATA_DIR = path.join(os.homedir(), ".local", "share", "opencode", "cloud_server_sync");
const DEFAULT_STATE_FILE = path.join(RUNTIME_DATA_DIR, "state.json");
const DEFAULT_CONFIG_FILE = path.join(RUNTIME_CONFIG_DIR, "config.json");
const DEFAULT_MANIFEST_FILE = path.join(RUNTIME_DATA_DIR, "manifest.json");
const MANIFEST_FILE_NAME = ".cloud_server_sync_manifest.json";
const SUPPORTED_EXTENSIONS = new Set([".md", ".txt"]);
const DANGEROUS_SOURCE_ROOTS = new Set(["/", "/root", "/etc", "/var", "/home", "/tmp", "/usr", "/bin", "/sbin", "/lib", "/lib64", "/boot", "/dev", "/proc", "/run", "/sys"]);
const PLACEHOLDER_REMOTE_ROOTS = new Set(["CHANGE_ME_SERVER_NAME", "example_server_sync"]);
const WRITE_INTERVAL_MS = 450;
const MAX_RETRIES = 4;

let lastWriteAt = 0;
let ensureFolderOverride = null;

function printUsage() {
  console.log(`Usage: feishu_sync.js [options]\n\nOptions:\n  --source <path>             File or directory to sync\n  --folder-token <id>         Create new docs under this Feishu folder\n  --config <path>             Config file path (default: ${DEFAULT_CONFIG_FILE})\n  --notify-to <open_id>       Send summary to this open_id\n  --state-file <path>         Metadata file path (default: ${DEFAULT_STATE_FILE})\n  --manifest-file <path>      Local manifest cache path (default: ${DEFAULT_MANIFEST_FILE})\n  --allow-dangerous-source    Allow broad system or home source roots\n  --dry-run                   Show planned changes without calling Feishu\n  -h, --help                  Show this help`);
}

function parseArgs(argv) {
  const args = { config: DEFAULT_CONFIG_FILE, stateFile: DEFAULT_STATE_FILE, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--source") args.source = argv[++i];
    else if (arg === "--folder-token") args.folderToken = argv[++i];
    else if (arg === "--config") args.config = argv[++i];
    else if (arg === "--notify-to") args.notifyTo = argv[++i];
    else if (arg === "--state-file") args.stateFile = argv[++i];
    else if (arg === "--manifest-file") args.manifestFile = argv[++i];
    else if (arg === "--allow-dangerous-source") args.allowDangerousSource = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "-h" || arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

function mergeOptions(cliOptions, fileOptions) {
  const merged = { ...fileOptions };
  for (const [key, value] of Object.entries(cliOptions)) {
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

function ensureArray(value, fieldName) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array in config`);
  return value;
}

function validateRemoteRootPath(options) {
  if (options.folderToken || options.remoteFolderPath) return [];
  const rootSegments = ensureArray(options.remoteRootPath, "remoteRootPath");
  if (rootSegments.length === 0) {
    throw new Error("remoteRootPath is required. Copy config/config.example.json to config/config.json and replace CHANGE_ME_SERVER_NAME with this server's folder name.");
  }
  const placeholders = rootSegments.filter((segment) => PLACEHOLDER_REMOTE_ROOTS.has(segment));
  if (placeholders.length === 0) return [];
  const warning = `remoteRootPath still contains placeholder value: ${placeholders.join("/")}. Replace it with this server's folder name before live sync.`;
  if (!options.dryRun) throw new Error(warning);
  return [warning];
}

function validateSourceRoot(sourcePath, allowDangerousSource = false) {
  if (!sourcePath) throw new Error("--source is required");
  const resolved = path.resolve(sourcePath);
  if (!fs.existsSync(resolved)) throw new Error(`Source path does not exist: ${resolved}`);
  const realSource = fs.realpathSync(resolved);
  if (!allowDangerousSource && DANGEROUS_SOURCE_ROOTS.has(realSource)) {
    throw new Error(`Refusing dangerous source root: ${realSource}. Use --allow-dangerous-source only after reviewing the exact file set with --dry-run.`);
  }
  return realSource;
}

function resolveStatePath(stateFile) {
  return path.isAbsolute(stateFile) ? stateFile : path.resolve(stateFile);
}

function resolveManifestPath(manifestFile) {
  return path.isAbsolute(manifestFile) ? manifestFile : path.resolve(manifestFile);
}

function deriveRemotePathSegments(sourceRoot, options) {
  if (options.remoteFolderPath) return ensureArray(options.remoteFolderPath, "remoteFolderPath");
  const rootSegments = ensureArray(options.remoteRootPath, "remoteRootPath");
  const normalizedSource = path.resolve(sourceRoot);
  if (path.isAbsolute(normalizedSource)) {
    return [...rootSegments, ...normalizedSource.split(path.sep).filter(Boolean)];
  }
  return [...rootSegments, path.basename(normalizedSource)];
}

function deriveRemoteRootSegments(options) {
  if (options.remoteFolderPath) return ensureArray(options.remoteFolderPath, "remoteFolderPath");
  return ensureArray(options.remoteRootPath, "remoteRootPath");
}

function remotePathForFile(filePath, sourceRoot, options) {
  const relativeDir = path.dirname(path.relative(sourceRoot, path.resolve(filePath)));
  const folderSegments = options.folderToken && !options.remoteRootPath ? [`folder-token:${options.folderToken}`] : deriveRemotePathSegments(sourceRoot, options);
  if (relativeDir && relativeDir !== ".") folderSegments.push(...relativeDir.split(path.sep).filter(Boolean));
  folderSegments.push(titleFromPath(filePath));
  return folderSegments.join("/");
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function loadState(stateFile) {
  return loadJson(stateFile, { version: 1, files: {} });
}

function saveState(stateFile, state) {
  ensureParentDir(stateFile);
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function buildManifest(state, options) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    remoteRootPath: options.folderToken ? [`folder-token:${options.folderToken}`] : deriveRemoteRootSegments(options),
    files: state.files || {},
  };
}

function writeManifestFile(manifest, manifestPath) {
  ensureParentDir(manifestPath);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function walkFiles(sourcePath) {
  const stat = fs.statSync(sourcePath);
  if (stat.isFile()) return [sourcePath];
  const results = [];
  const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const fullPath = path.join(sourcePath, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(fullPath));
    else if (entry.isFile()) results.push(fullPath);
  }
  return results;
}

function collectFiles(sourcePath) {
  const resolved = path.resolve(sourcePath);
  if (!fs.existsSync(resolved)) throw new Error(`Source path does not exist: ${resolved}`);
  const allFiles = walkFiles(resolved).sort();
  const supported = [];
  const skipped = [];
  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) supported.push(filePath);
    else skipped.push(filePath);
  }
  return { supported, skipped };
}

function titleFromPath(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function runCommand(command, commandArgs, commandOptions = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
    cwd: commandOptions.cwd,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(stderr || stdout || `${command} exited with code ${result.status}`);
  }
  return { stdout: (result.stdout || "").trim(), stderr: (result.stderr || "").trim() };
}

function isRetryableWriteError(message) {
  const text = message.toLowerCase();
  return text.includes("frequency limit") || text.includes("rate limit") || text.includes("too many requests") || text.includes("system under maintenance") || text.includes("internal error") || text.includes("internal time out") || text.includes("gateway service internal error") || text.includes("can retry");
}

function paceWrites() {
  const now = Date.now();
  const waitMs = lastWriteAt + WRITE_INTERVAL_MS - now;
  if (waitMs > 0) sleep(waitMs);
  lastWriteAt = Date.now();
}

function runWriteCommand(command, commandArgs, commandOptions = {}) {
  let attempt = 0;
  let delayMs = 1000;
  while (attempt <= MAX_RETRIES) {
    paceWrites();
    try {
      return runCommand(command, commandArgs, commandOptions);
    } catch (error) {
      if (attempt === MAX_RETRIES || !isRetryableWriteError(error.message)) throw error;
      sleep(delayMs);
      delayMs *= 2;
      attempt += 1;
    }
  }
  throw new Error(`Unexpected retry loop exit for ${command}`);
}

function parseJsonOutput(output) {
  if (!output) throw new Error("Command returned empty JSON output");
  try {
    return JSON.parse(output);
  } catch (error) {
    const candidates = [];
    const newlineObjectIndex = output.lastIndexOf("\n{");
    if (newlineObjectIndex >= 0) candidates.push(output.slice(newlineObjectIndex + 1).trim());
    const firstObjectIndex = output.indexOf("{");
    if (firstObjectIndex >= 0) candidates.push(output.slice(firstObjectIndex).trim());
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {}
    }
    throw new Error(`Failed to parse JSON output: ${error.message}\n${output}`);
  }
}

function getDefaultNotifyTo() {
  const { stdout } = runCommand("lark-cli", ["auth", "status"]);
  const parsed = parseJsonOutput(stdout);
  if (!parsed.userOpenId) throw new Error("No authenticated lark-cli userOpenId found");
  return parsed.userOpenId;
}

function listFolderItems(folderToken, commandRunner = runCommand) {
  const files = [];
  let pageToken = "";
  do {
    const request = { folder_token: folderToken, page_size: 200 };
    if (pageToken) request.page_token = pageToken;
    const { stdout } = commandRunner("lark-cli", ["api", "GET", "/open-apis/drive/v1/files", "--params", JSON.stringify(request)]);
    const parsed = parseJsonOutput(stdout);
    files.push(...(parsed.data?.files || []));
    if (parsed.data?.has_more && !parsed.data?.next_page_token) throw new Error(`Folder listing for ${folderToken} has more pages but no next_page_token`);
    pageToken = parsed.data?.has_more ? parsed.data.next_page_token : "";
  } while (pageToken);
  return files;
}

function ensureFolder(parentToken, name) {
  const items = listFolderItems(parentToken);
  const match = items.filter((item) => item.type === "folder" && item.name === name).sort((a, b) => Number(a.created_time || 0) - Number(b.created_time || 0))[0];
  if (match) return match.token;
  const args = ["drive", "+create-folder", "--name", name];
  if (parentToken) args.push("--folder-token", parentToken);
  const { stdout } = runWriteCommand("lark-cli", args);
  const parsed = parseJsonOutput(stdout);
  const token = parsed.data?.folder_token;
  if (!token) throw new Error(`Unexpected create-folder response: ${stdout}`);
  return token;
}

function callEnsureFolder(parentToken, name) {
  return (ensureFolderOverride || ensureFolder)(parentToken, name);
}

function ensureRemoteFolderToken(options, relativeDir) {
  if (options.folderToken) return options.folderToken;
  const remotePath = deriveRemotePathSegments(options.source, options);
  let token = "";
  for (const segment of remotePath) token = ensureFolder(token, segment);
  if (relativeDir && relativeDir !== ".") {
    for (const segment of relativeDir.split(path.sep).filter(Boolean)) token = ensureFolder(token, segment);
  }
  return token;
}

function ensureRemoteRootFolderToken(options) {
  if (options.folderToken) return options.folderToken;
  const remoteRoot = deriveRemoteRootSegments(options);
  let token = "";
  for (const segment of remoteRoot) token = callEnsureFolder(token, segment);
  return token;
}

function __setEnsureFolderForTest(fn) {
  ensureFolderOverride = fn;
}

function findFileInFolder(folderToken, name, commandRunner = runCommand) {
  const items = listFolderItems(folderToken, commandRunner);
  const matches = items.filter((item) => item.type === "file" && item.name === name);
  if (matches.length > 1) throw new Error(`Multiple ${name} files found in remote folder ${folderToken}; remove duplicates before continuing.`);
  return matches[0] || null;
}

function uploadManifest(manifestPath, folderToken, existingFileToken, commandRunner = runWriteCommand) {
  const args = ["drive", "+upload", "--file", `./${path.basename(manifestPath)}`, "--name", MANIFEST_FILE_NAME];
  if (existingFileToken) args.push("--file-token", existingFileToken);
  else if (folderToken) args.push("--folder-token", folderToken);
  const { stdout } = commandRunner("lark-cli", args, { cwd: path.dirname(manifestPath) });
  const parsed = parseJsonOutput(stdout);
  return parsed.data || parsed;
}

function syncManifest(state, options) {
  const rootToken = ensureRemoteRootFolderToken(options);
  const existingManifest = findFileInFolder(rootToken, MANIFEST_FILE_NAME);
  const manifestPath = resolveManifestPath(options.manifestFile || DEFAULT_MANIFEST_FILE);
  writeManifestFile(buildManifest(state, options), manifestPath);
  return uploadManifest(manifestPath, rootToken, existingManifest?.token);
}

function createDoc(filePath, title, folderToken) {
  const args = ["docs", "+create", "--folder-token", folderToken, "--title", title, "--markdown", `@./${path.basename(filePath)}`];
  const { stdout } = runWriteCommand("lark-cli", args, { cwd: path.dirname(filePath) });
  const parsed = parseJsonOutput(stdout);
  const data = parsed.data || parsed;
  if (!data.document_id && !data.doc_id) throw new Error(`Unexpected doc create response: ${stdout}`);
  return data;
}

function updateDoc(docId, filePath, title) {
  const args = ["docs", "+update", "--doc", docId, "--mode", "overwrite", "--markdown", `@./${path.basename(filePath)}`, "--new-title", title];
  const { stdout } = runWriteCommand("lark-cli", args, { cwd: path.dirname(filePath) });
  const parsed = parseJsonOutput(stdout);
  return parsed.data || parsed;
}

function sendNotification(openId, text) {
  const message = `op\n${text}`;
  runWriteCommand("lark-cli", ["im", "+messages-send", "--as", "user", "--user-id", openId, "--text", message]);
}

function buildSummary(results, skippedUnsupported, sourcePath, dryRun, metadata = {}) {
  const lines = [];
  lines.push(dryRun ? "Feishu sync dry run complete." : "Feishu sync complete.");
  lines.push(`Source: ${sourcePath}`);
  if (metadata.remoteRootPath) lines.push(`Remote root: ${metadata.remoteRootPath.join("/")}`);
  lines.push(`Created: ${results.created.length}`);
  lines.push(`Updated: ${results.updated.length}`);
  lines.push(`Unchanged: ${results.unchanged.length}`);
  lines.push(`Failed: ${results.failed.length}`);
  lines.push(`Skipped unsupported: ${skippedUnsupported.length}`);
  if (metadata.warnings?.length) {
    lines.push("");
    for (const warning of metadata.warnings) lines.push(`Warning: ${warning}`);
  }
  const detailLines = [];
  for (const item of results.created) detailLines.push(`Created: ${item.filePath} -> ${item.remotePath || item.docId}`);
  for (const item of results.updated) detailLines.push(`Updated: ${item.filePath} -> ${item.remotePath || item.docId}`);
  for (const item of results.failed) detailLines.push(`Failed: ${item.filePath} -> ${item.error}`);
  for (const item of skippedUnsupported.slice(0, 10)) detailLines.push(`Skipped: ${item}`);
  if (skippedUnsupported.length > 10) detailLines.push(`Skipped: ... and ${skippedUnsupported.length - 10} more unsupported files`);
  if (detailLines.length > 30) {
    detailLines.length = 30;
    detailLines.push("Details truncated to keep the Feishu message small.");
  }
  if (detailLines.length > 0) {
    lines.push("");
    lines.push(...detailLines);
  }
  return lines.join("\n");
}

function syncFile(filePath, sourceRoot, state, options, results) {
  const resolvedPath = path.resolve(filePath);
  const fileChecksum = sha256(resolvedPath);
  const currentTitle = titleFromPath(resolvedPath);
  const mtimeMs = fs.statSync(resolvedPath).mtimeMs;
  const existing = state.files[resolvedPath];
  const relativeDir = path.dirname(path.relative(sourceRoot, resolvedPath));
  if (existing && existing.checksum === fileChecksum && existing.title === currentTitle) {
    results.unchanged.push({ filePath: resolvedPath, docId: existing.docId });
    return;
  }
  if (options.dryRun) {
    const bucket = existing ? results.updated : results.created;
    bucket.push({ filePath: resolvedPath, docId: existing ? existing.docId : "(dry-run)", remotePath: remotePathForFile(resolvedPath, sourceRoot, options) });
    return;
  }
  if (!existing || !existing.docId) {
    const folderToken = ensureRemoteFolderToken(options, relativeDir);
    const created = createDoc(resolvedPath, currentTitle, folderToken);
    const createdDocId = created.document_id || created.doc_id;
    state.files[resolvedPath] = { docId: createdDocId, title: currentTitle, checksum: fileChecksum, mtimeMs, folderToken, lastSyncedAt: new Date().toISOString() };
    results.created.push({ filePath: resolvedPath, docId: createdDocId });
    return;
  }
  updateDoc(existing.docId, resolvedPath, currentTitle);
  state.files[resolvedPath] = { ...existing, title: currentTitle, checksum: fileChecksum, mtimeMs, lastSyncedAt: new Date().toISOString() };
  results.updated.push({ filePath: resolvedPath, docId: existing.docId });
}

function main() {
  const cliOptions = parseArgs(process.argv.slice(2));
  if (cliOptions.help) return printUsage();
  const fileOptions = loadJson(cliOptions.config, {});
  const options = mergeOptions(cliOptions, fileOptions);
  if (!options.source) throw new Error("--source is required");
  options.stateFile = resolveStatePath(options.stateFile || DEFAULT_STATE_FILE);
  const warnings = validateRemoteRootPath(options);
  const sourceRoot = validateSourceRoot(options.source, options.allowDangerousSource);
  options.source = sourceRoot;
  const { supported, skipped } = collectFiles(sourceRoot);
  const state = loadState(options.stateFile);
  const results = { created: [], updated: [], unchanged: [], failed: [] };
  for (const filePath of supported) {
    try {
      syncFile(filePath, sourceRoot, state, options, results);
    } catch (error) {
      results.failed.push({ filePath: path.resolve(filePath), error: error.message });
    }
  }
  let manifestResult = null;
  if (!options.dryRun) {
    saveState(options.stateFile, state);
    manifestResult = syncManifest(state, options);
  }
  const summary = buildSummary(results, skipped, path.resolve(options.source), options.dryRun, {
    remoteRootPath: options.remoteFolderPath || ensureArray(options.remoteRootPath, "remoteRootPath"),
    warnings,
  });
  console.log(summary);
  if (manifestResult?.file_token || manifestResult?.token) console.log(`Manifest uploaded: ${manifestResult.file_token || manifestResult.token}`);
  if (!options.dryRun) {
    const notifyTo = options.notifyTo || getDefaultNotifyTo();
    try {
      sendNotification(notifyTo, summary);
      console.log(`Notification sent to ${notifyTo}`);
    } catch (error) {
      console.error(`Failed to send notification: ${error.message}`);
      process.exitCode = 1;
    }
  }
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
  DEFAULT_CONFIG_FILE,
  DEFAULT_STATE_FILE,
  DEFAULT_MANIFEST_FILE,
  MANIFEST_FILE_NAME,
  DANGEROUS_SOURCE_ROOTS,
  PLACEHOLDER_REMOTE_ROOTS,
  SUPPORTED_EXTENSIONS,
  parseArgs,
  loadJson,
  mergeOptions,
  ensureArray,
  validateRemoteRootPath,
  validateSourceRoot,
  resolveStatePath,
  resolveManifestPath,
  loadState,
  saveState,
  buildManifest,
  writeManifestFile,
  deriveRemotePathSegments,
  deriveRemoteRootSegments,
  ensureRemoteRootFolderToken,
  remotePathForFile,
  collectFiles,
  titleFromPath,
  parseJsonOutput,
  listFolderItems,
  ensureFolder,
  findFileInFolder,
  uploadManifest,
  __setEnsureFolderForTest,
  buildSummary,
};
