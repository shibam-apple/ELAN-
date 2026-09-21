import { z } from "zod";

/**
 * Question types, ordered by the depth of processing they force.
 * Shallow question sets are the main failure mode of generated practice,
 * so the type is explicit and the generator is held to a target mix.
 */
export const QuestionType = z.enum([
  "recall", // retrieve a fact or definition from memory
  "application", // use the idea on a new case
  "explanation", // say why something is true, or how it works
  "discrimination", // tell two easily-confused things apart
]);
export type QuestionType = z.infer<typeof QuestionType>;

export const Question = z.object({
  concept: z.string().describe("The single idea this tests, as a short noun phrase."),
  type: QuestionType,
  prompt: z.string().describe("The question shown to the learner."),
  answer: z.string().describe("A complete model answer, 1-4 sentences."),
  sourceQuote: z
    .string()
    .describe("Verbatim passage from the material this came from, for traceability."),
  misconception: z
    .string()
    .describe("What getting this wrong most likely reveals the learner misunderstands."),
  difficulty: z.number().int().min(1).max(5),
});
export type Question = z.infer<typeof Question>;

export const QuestionSet = z.object({
  /** One line on what the material actually covers, used to catch bad ingests early. */
  materialSummary: z.string(),
  /** Concepts the generator judged too thin in the source to test honestly. */
  gaps: z.array(z.string()),
  questions: z.array(Question),
});
export type QuestionSet = z.infer<typeof QuestionSet>;

export interface SourceMaterial {
  kind: "youtube" | "pdf" | "text";
  /** URL, file path, or "stdin" - kept so generated cards stay traceable to their origin. */
  origin: string;
  title: string;
  text: string;
}
