import { cp, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const distAssets = join(dist, "assets");
const rootAssets = join(root, "assets");

// Remove only Vite-generated root assets that are no longer present in this build.
// Keep project-owned files such as assets/css/style.css intact.
const currentAssets = new Set(await readdir(distAssets).catch(() => []));
for (const name of await readdir(rootAssets).catch(() => [])) {
  if (!name.endsWith(".js") && !name.endsWith(".css")) continue;
  if (!currentAssets.has(name)) {
    await rm(join(rootAssets, name), { force: true });
  }
}

// Mirror the finished static site to main:/ for repositories still using
// GitHub Pages' "Deploy from a branch" source. The Actions artifact is kept in dist.
await cp(dist, root, { recursive: true, force: true });
console.log("Static Vite output mirrored to the repository root for branch-based Pages.");
