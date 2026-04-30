const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const filesToCopy = ["server.js", "package.json", "package-lock.json", ".env"];
const dirsToCopy = [
  "config",
  "controllers",
  "middleware",
  "models",
  "routes",
  "uploads",
  "utils",
];

function removeDist() {
  if (fs.existsSync(dist)) {
    fs.rmSync(dist, { recursive: true, force: true });
  }
}

function copyFileIfExists(fileName) {
  const source = path.join(root, fileName);
  if (!fs.existsSync(source)) {
    return;
  }

  const target = path.join(dist, fileName);
  fs.copyFileSync(source, target);
}

function copyDirIfExists(dirName) {
  const source = path.join(root, dirName);
  if (!fs.existsSync(source)) {
    return;
  }

  const target = path.join(dist, dirName);
  fs.cpSync(source, target, { recursive: true });
}

function build() {
  removeDist();
  fs.mkdirSync(dist, { recursive: true });

  filesToCopy.forEach(copyFileIfExists);
  dirsToCopy.forEach(copyDirIfExists);

  console.log("Build completed. Output directory:", dist);
}

build();
