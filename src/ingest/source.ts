import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { YoutubeTranscript } from "youtube-transcript";
import { extractText, getDocumentProxy } from "unpdf";
import type { SourceMaterial } from "../types.js";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

function isYoutubeUrl(input: string): boolean {
  try {
    return YOUTUBE_HOSTS.has(new URL(input).hostname);
  } catch {
    return false;
  }
}

async function fromYoutube(url: string): Promise<SourceMaterial> {
  const segments = await YoutubeTranscript.fetchTranscript(url);
  if (segments.length === 0) {
    throw new Error(`No transcript available for ${url}`);
  }
  // Transcript segments break mid-sentence; join and let the model handle prose.
  const text = segments
    .map((s) => s.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
  return { kind: "youtube", origin: url, title: url, text };
}

async function fromPdf(path: string): Promise<SourceMaterial> {
  const buffer = await readFile(path);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return { kind: "pdf", origin: path, title: basename(path), text };
}

async function fromTextFile(path: string): Promise<SourceMaterial> {
  const text = await readFile(path, "utf8");
  return { kind: "text", origin: path, title: basename(path), text };
}

export async function loadSource(input: string): Promise<SourceMaterial> {
  const material = isYoutubeUrl(input)
    ? await fromYoutube(input)
    : input.toLowerCase().endsWith(".pdf")
      ? await fromPdf(input)
      : await fromTextFile(input);

  if (material.text.trim().length < 200) {
    throw new Error(
      `Extracted only ${material.text.trim().length} characters from ${input}. ` +
        `Too little to generate honest questions from.`,
    );
  }
  return material;
}
