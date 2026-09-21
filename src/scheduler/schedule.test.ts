import { describe, expect, it } from "vitest";
import { dueQueue, isDue, newCard, review } from "./schedule.js";

const T0 = new Date("2026-01-01T00:00:00Z");
const daysAfter = (n: number) => new Date(T0.getTime() + n * 86_400_000);

describe("scheduling", () => {
  it("makes a new card due immediately", () => {
    expect(isDue(newCard(T0), T0)).toBe(true);
  });

  it("pushes the next review further out for a good answer than a failed one", () => {
    const card = newCard(T0);
    const failed = review(card, "again", T0);
    const passed = review(card, "good", T0);
    expect(passed.due.getTime()).toBeGreaterThan(failed.due.getTime());
  });

  it("lengthens intervals across a streak of good answers", () => {
    let card = newCard(T0);
    card = review(card, "good", T0);
    const firstGap = card.due.getTime() - T0.getTime();

    const secondReviewAt = card.due;
    card = review(card, "good", secondReviewAt);
    const secondGap = card.due.getTime() - secondReviewAt.getTime();

    expect(secondGap).toBeGreaterThan(firstGap);
  });

  it("raises difficulty when a card is failed", () => {
    const card = newCard(T0);
    expect(review(card, "again", T0).difficulty).toBeGreaterThan(
      review(card, "easy", T0).difficulty,
    );
  });

  it("returns only due cards, hardest first", () => {
    const easy = { id: "easy", card: review(newCard(T0), "easy", T0) };
    const hard = { id: "hard", card: review(newCard(T0), "hard", T0) };
    const future = { id: "future", card: review(newCard(T0), "easy", daysAfter(30)) };

    const queue = dueQueue([easy, hard, future], daysAfter(10));
    expect(queue.map((q) => q.id)).toEqual(["hard", "easy"]);
  });
});
