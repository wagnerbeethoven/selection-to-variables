const esbuild = require("esbuild");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, ".tmp-tests");
const outfile = path.join(outDir, "token-helpers.test.cjs");

fs.mkdirSync(outDir, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(root, "tests", "token-helpers.test.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile,
  sourcemap: "inline",
  external: ["node:test", "node:assert/strict"]
});

const result = spawnSync(process.execPath, ["--test", outfile], {
  cwd: root,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
