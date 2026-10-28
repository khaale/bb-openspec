import { useSyncExternalStore } from "react";
import { z } from "zod";
import { storeIdSchema } from "./planning-source";

const schema = z.object({
  projectId: z.string(),
  environmentId: z.string().optional(),
  storeId: storeIdSchema.nullable().optional(),
});
type PlanningContext = z.infer<typeof schema>;
const key = "openspec:planning-context";
let cached: string | null | undefined;
let snapshot: PlanningContext | undefined;
function read() {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== cached) {
      cached = raw;
      const parsed = schema.safeParse(raw ? JSON.parse(raw) : undefined);
      snapshot = parsed.success ? parsed.data : undefined;
    }
    return snapshot;
  } catch { snapshot = undefined; return undefined; }
}
function subscribe(listener: () => void) {
  window.addEventListener(key, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(key, listener);
    window.removeEventListener("storage", listener);
  };
}
/** Only navigation panels share this context; a thread retains its own environment/binding. */
export function usePlanningContext() { return useSyncExternalStore(subscribe, read, () => undefined); }
export function savePlanningContext(context: PlanningContext) {
  try { localStorage.setItem(key, JSON.stringify(context)); window.dispatchEvent(new Event(key)); } catch { /* Storage may be unavailable in a restricted browser. */ }
}
