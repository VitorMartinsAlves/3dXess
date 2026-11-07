import { cp, mkdir, access, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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


const referenceModelUrl = "https://raw.githubusercontent.com/mrabhin03/3D-Chess-Game/4b66ca40261a3deff228db0038d8e7b59d086b1a/assets/ChessGLB.glb";
const expectedGitBlobSha = "42e984af7073a5a355ecf7dd152d5921b5b29275";
const modelDirectory = resolve(legacyDestination, "game", "assets");
const modelPath = resolve(modelDirectory, "ChessGLB.glb");

await mkdir(modelDirectory, { recursive: true });
try {
  const response = await fetch(referenceModelUrl);
  if (!response.ok) {
    throw new Error(`Download HTTP ${response.status}`);
  }

  const model = Buffer.from(await response.arrayBuffer());
  const actualGitBlobSha = createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${model.length}\\0`), model]))
    .digest("hex");

  if (actualGitBlobSha !== expectedGitBlobSha) {
    throw new Error("O hash do modelo baixado não corresponde à revisão fixada.");
  }

  await writeFile(modelPath, model);
  console.log(`Modelo 3D de referência preparado (${(model.length / 1024 / 1024).toFixed(2)} MB).`);
} catch (error) {
  console.warn("Não foi possível preparar o modelo externo; o jogo usará as peças procedurais.", error);
}
