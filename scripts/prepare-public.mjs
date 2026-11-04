import { cp, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const legacySource = resolve(root, "legacy");
const publicDirectory = resolve(root, "public");
const legacyDestination = resolve(publicDirectory, "legacy");

await mkdir(publicDirectory, { recursive: true });
await access(legacySource, constants.R_OK);
await cp(legacySource, legacyDestination, { recursive: true, force: true });

console.log("Assets legados copiados para public/legacy.");
