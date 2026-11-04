import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
await copyFile(
  resolve(root, "index.template.html"),
  resolve(root, "index.html"),
);
console.log("Vite HTML template restored.");
