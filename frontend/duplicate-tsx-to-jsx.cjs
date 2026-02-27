const fs = require("fs");
const path = require("path");

function duplicateTsxToJsx(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const jsxPath = filePath.replace(/\.tsx$/, ".jsx");

  // If a JSX file already exists, skip to avoid overwriting manual edits
  if (fs.existsSync(jsxPath)) {
    console.log(`⏭  Skipping (already exists): ${jsxPath}`);
    return;
  }

  fs.writeFileSync(jsxPath, content, "utf8");
  console.log(`✅ Created JSX copy: ${path.relative(process.cwd(), jsxPath)}`);
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      duplicateTsxToJsx(entryPath);
    }
  }
}

console.log("🔄 Creating .jsx copies for every .tsx file (no deletions, no imports changed)...");
walkDir(path.join(__dirname, "src"));
console.log("✨ Done duplicating TSX → JSX.");


