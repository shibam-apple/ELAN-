import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { QuestionSet, type SourceMaterial } from "../types.js";
import { QUESTION_SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";

const MODEL = process.env.ELAN_MODEL ?? "claude-opus-5";

const client = new Anthropic();

export async function generateQuestions(
  material: SourceMaterial,
  targetCount = 20,
): Promise<QuestionSet> {
  // Structured outputs live on the beta path in @anthropic-ai/sdk 0.70.x.
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Thinking is omitted deliberately: Opus 5 runs adaptive thinking by
    // default, and this SDK version predates the explicit "adaptive" type.
    system: [
      {
        type: "text",
        text: QUESTION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildUserPrompt({
          title: material.title,
          kind: material.kind,
          text: material.text,
          targetCount,
        }),
      },
    ],
    output_format: betaZodOutputFormat(QuestionSet),
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Generation was refused by the safety classifier.");
  }
  if (!response.parsed_output) {
    throw new Error("Model returned no parseable question set.");
  }

  const { input_tokens, output_tokens, cache_read_input_tokens } = response.usage;
  process.stderr.write(
    `[elan] ${MODEL} in=${input_tokens} cached=${cache_read_input_tokens ?? 0} out=${output_tokens}\n`,
  );

  return response.parsed_output;
}
