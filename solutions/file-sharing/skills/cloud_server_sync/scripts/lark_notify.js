#!/usr/bin/env node

const { spawnSync } = require("child_process");

function usage() {
  console.log(`Usage: lark_notify.js --text <message> [options]\n\nOptions:\n  --text <message>   Notification text (required)\n  --user-id <open_id> Target user open_id; defaults to current lark-cli user\n  --prefix <text>    Short prefix (default: op)\n  -h, --help         Show this help`);
}

function parseArgs(argv) {
  const args = { prefix: "op" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--text") args.text = argv[++i];
    else if (arg === "--user-id") args.userId = argv[++i];
    else if (arg === "--prefix") args.prefix = argv[++i];
    else if (arg === "-h" || arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `${command} failed`).trim());
  }
  return (result.stdout || "").trim();
}

function currentUserOpenId() {
  const parsed = JSON.parse(run("lark-cli", ["auth", "status"]));
  if (!parsed.userOpenId) {
    throw new Error("No authenticated lark-cli userOpenId found");
  }
  return parsed.userOpenId;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  if (!args.text) throw new Error("--text is required");
  const userId = args.userId || currentUserOpenId();
  const prefix = (args.prefix || "").trim();
  const text = prefix ? `${prefix}\n${args.text}` : args.text;
  run("lark-cli", ["im", "+messages-send", "--as", "user", "--user-id", userId, "--text", text]);
  console.log(`Notification sent to ${userId}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
