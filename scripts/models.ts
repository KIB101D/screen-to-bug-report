/** Lists models this API key can call with generateContent: npm run models */
import { GoogleGenAI } from "@google/genai";
import { PRICING } from "../src/lib/config";

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const pager = await ai.models.list();
  for await (const m of pager) {
    if (!m.supportedActions?.includes("generateContent")) continue;
    const id = (m.name ?? "").replace(/^models\//, "");
    if (!id.includes("gemini")) continue;
    console.log(`${id.padEnd(40)} ${PRICING[id] ? "priced" : "      "}  ${m.displayName ?? ""}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
