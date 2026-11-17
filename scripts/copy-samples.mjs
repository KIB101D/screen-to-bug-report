// Copies the test-set recordings to public/samples so the web app can offer them as samples.
// Runs before dev and build; public/samples is git-ignored to keep one copy of each file in the repo.
import { copyFile, mkdir, readdir } from "node:fs/promises";

await mkdir("public/samples", { recursive: true });
const files = (await readdir("recordings").catch(() => [])).filter((f) => /\.(mp4|mov|webm)$/i.test(f));
await Promise.all(files.map((f) => copyFile(`recordings/${f}`, `public/samples/${f}`)));
console.log(`copied ${files.length} sample recording(s) to public/samples`);
