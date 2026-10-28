import { test } from "node:test";
import assert from "node:assert/strict";
import { compareChanges } from "../src/change-order.ts";

test("working agent comes first, then newest artifacts, alphabet only breaks ties", () => {
  const thread = {
    id: "t",
    title: "Agent",
    providerId: "codex",
    status: "active",
    archived: false,
  };
  const cards = [
    { id: "a-old", updatedAt: 1, threads: [] },
    { id: "z-working", updatedAt: 0, threads: [thread] },
    { id: "z-fresh", updatedAt: 20, threads: [] },
    { id: "a-fresh", updatedAt: 20, threads: [] },
  ];
  assert.deepEqual(
    cards.sort(compareChanges).map((card) => card.id),
    ["z-working", "a-fresh", "z-fresh", "a-old"],
  );
});
