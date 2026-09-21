import { writeFile } from "node:fs/promises";
import { loadSource } from "./ingest/source.js";
import { generateQuestions } from "./generate/questions.js";

/**
 * Throwaway harness for the only question that matters right now: are the
 * generated questions any good? Judge them yourself before building UI.
 *
 *   npm run ingest -- <youtube-url | file.pdf | notes.txt> [--count 20] [--out set.json]
 */
async function main() {
  const args = process.argv.slice(2);
  const input = args[0];
  if (!input) {
    console.error("usage: npm run ingest -- <youtube-url | file.pdf | notes.txt> [--count N] [--out FILE]");
    process.exit(1);
  }

  const countFlag = args.indexOf("--count");
  const count = countFlag === -1 ? 20 : Number(args[countFlag + 1]);
  const outFlag = args.indexOf("--out");
  const outPath = outFlag === -1 ? undefined : args[outFlag + 1];

  const material = await loadSource(input);
  console.error(`[elan] ${material.kind}: ${material.text.length} chars from ${material.title}`);

  const set = await generateQuestions(material, count);

  console.log(`\n${set.materialSummary}\n`);
  set.questions.forEach((q, i) => {
    console.log(`${i + 1}. [${q.type} · d${q.difficulty}] ${q.prompt}`);
    console.log(`   → ${q.answer}`);
    console.log(`   source: "${q.sourceQuote.slice(0, 120)}${q.sourceQuote.length > 120 ? "…" : ""}"`);
    console.log(`   miss reveals: ${q.misconception}\n`);
  });

  if (set.gaps.length > 0) {
    console.log(`Gaps the material leaves open:`);
    for (const gap of set.gaps) console.log(`  · ${gap}`);
    console.log();
  }

  if (outPath) {
    await writeFile(outPath, JSON.stringify({ material, set }, null, 2));
    console.error(`[elan] wrote ${outPath}`);
  }
}

main().catch((error: unknown) => {
  console.error(`[elan] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
