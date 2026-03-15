const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const isWatch = process.argv.includes("--watch");
const root = __dirname;
const distDir = path.join(root, "dist");
const uiSource = path.join(root, "src", "ui.html");
const uiTarget = path.join(distDir, "ui.html");

function ensureDist() {
  fs.mkdirSync(distDir, { recursive: true });
}

async function run() {
  ensureDist();

  const ctx = await esbuild.context({
    entryPoints: [path.join(root, "src", "code.ts"), path.join(root, "src", "ui.ts")],
    bundle: true,
    format: "iife",
    target: "es2018",
    platform: "browser",
    outdir: distDir
  });

  if (isWatch) {
    await ctx.watch();
    console.log("Watching for changes...");
    return;
  }

  await ctx.rebuild();
  inlineUiScript();
  await ctx.dispose();
  console.log("Build complete.");
}

function inlineUiScript() {
  const html = fs.readFileSync(uiSource, "utf8");
  const uiScript = fs.readFileSync(path.join(distDir, "ui.js"), "utf8");
  const finalHtml = html.replace("<!-- UI_SCRIPT -->", `<script>\n${uiScript}\n</script>`);
  fs.writeFileSync(uiTarget, finalHtml, "utf8");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
