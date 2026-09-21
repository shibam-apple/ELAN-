import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from "ts-fsrs";

/**
 * Scheduling is deterministic and model-free on purpose: it is arithmetic over
 * review history, it must be testable, and it has to work offline.
 *
 * FSRS is used rather than a hand-rolled interval scheme - do not invent one.
 */
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

export type Grade = "again" | "hard" | "good" | "easy";

const GRADE_TO_RATING: Record<Grade, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export function newCard(now = new Date()): Card {
  return createEmptyCard(now);
}

export function review(card: Card, grade: Grade, now = new Date()): Card {
  return scheduler.next(card, now, GRADE_TO_RATING[grade]).card;
}

export function isDue(card: Card, now = new Date()): boolean {
  return card.due.getTime() <= now.getTime();
}

/** Due cards first, hardest-remembered first within that. */
export function dueQueue<T extends { card: Card }>(items: T[], now = new Date()): T[] {
  return items
    .filter((item) => isDue(item.card, now))
    .sort((a, b) => a.card.difficulty - b.card.difficulty)
    .reverse();
}
