import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { QuestionSet, type SourceMaterial } from "../types.js";
import { QUESTION_SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";

const MODEL = process.env.ELAN_MODEL ?? "claude-opus-5";

const client = new Anthropic();

export async function generateQuestions(
  material: SourceMaterial,
  targetCount = 20,
): Promise<QuestionSet> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
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
    output_config: { format: zodOutputFormat(QuestionSet) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Generation refused: ${response.stop_details?.explanation ?? "no reason given"}`);
  }
  if (!response.parsed_output) {
    throw new Error("Model returned no parseable question set.");
  }

  const usage = response.usage;
  process.stderr.write(
    `[elan] ${MODEL} in=${usage.input_tokens} cached=${usage.cache_read_input_tokens ?? 0} out=${usage.output_tokens}\n`,
  );

  return response.parsed_output;
}
