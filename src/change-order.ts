import type { Change, LinkedThread } from "./model";

type Card = Pick<Change, "id" | "updatedAt"> & { threads: LinkedThread[] };
export function compareChanges(left: Card, right: Card): number {
  const running = (card: Card) =>
    card.threads.some((thread) => thread.status === "active") ? 1 : 0;
  return (
    running(right) - running(left) ||
    right.updatedAt - left.updatedAt ||
    left.id.localeCompare(right.id)
  );
}
