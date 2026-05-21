import esbuild from "esbuild";

const banner =
  "/* THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY. */";
const isProduction = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
  outfile: "main.js",
  banner: {
    js: banner,
  },
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view"],
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: "info",
});

if (isProduction) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
  console.log("Watching for changes...");
}
