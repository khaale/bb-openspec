import { z } from "zod";
import { sourceSelectionSchema } from "./planning-source";

export const ACTION = {
  EXPLORE: "explore",
  APPLY: "apply",
  VERIFY: "verify",
} as const;
export const actionSchema = z.enum([
  ACTION.EXPLORE,
  ACTION.APPLY,
  ACTION.VERIFY,
]);
export type Action = z.infer<typeof actionSchema>;
export const ACTION_LABEL: Record<Action, string> = {
  explore: "Проработать",
  apply: "Реализовать",
  verify: "Проверить",
};
export const artifactKinds = ["proposal", "specs", "design", "tasks"] as const;
export const ARTIFACT_LABEL = {
  proposal: "Proposal",
  specs: "Specs",
  design: "Design",
  tasks: "Tasks",
} as const;
export type ArtifactKind = (typeof artifactKinds)[number];
export const taskSchema = z.object({
  number: z.string(),
  title: z.string(),
  done: z.boolean(),
});
export const groupSchema = z.object({
  title: z.string(),
  tasks: z.array(taskSchema),
});
export type TaskGroup = z.infer<typeof groupSchema>;
export const artifactSchema = z.object({
  kind: z.enum(artifactKinds),
  paths: z.array(z.string()),
});
export const changeSchema = z.object({
  id: z.string(),
  title: z.string(),
  archived: z.boolean(),
  artifacts: z.array(artifactSchema),
  done: z.number(),
  total: z.number(),
  error: z.string().nullable(),
  updatedAt: z.number(),
});
export type Change = z.infer<typeof changeSchema>;
export const environmentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  path: z.string(),
  hostId: z.string(),
});
export type Workspace = z.infer<typeof environmentSchema>;
export const threadSchema = z.object({
  id: z.string(),
  title: z.string(),
  providerId: z.string(),
  status: z.string(),
  archived: z.boolean(),
});
export type LinkedThread = z.infer<typeof threadSchema>;
export const executionSchema = z.object({
  providerId: z.string(),
  model: z.string(),
  reasoningLevel: z.string(),
  serviceTier: z.string().optional(),
  permissionMode: z.enum(["auto", "accept-edits", "full"]),
});
export const targetSchema = sourceSelectionSchema.extend({
  environmentId: z.string().min(1),
  changeId: z.string().min(1).max(250),
});

/** Fenced examples are not tracked tasks. Only x/X completes a checkbox. */
export function parseTasks(markdown: string): TaskGroup[] {
  const groups: TaskGroup[] = [];
  let current: TaskGroup | undefined;
  let fence: { char: string; length: number } | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (delimiter) {
      const run = delimiter[1];
      if (!fence) fence = { char: run[0], length: run.length };
      else if (
        run[0] === fence.char &&
        run.length >= fence.length &&
        !delimiter[2].trim()
      )
        fence = undefined;
      continue;
    }
    if (fence) continue;
    const heading = /^ {0,3}##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      current = { title: heading[1], tasks: [] };
      groups.push(current);
      continue;
    }
    const item = /^ {0,3}[-*+]\s+\[([^\]]*)\]\s*(.*)$/.exec(line);
    if (!item) continue;
    if (!current) {
      current = { title: "Задачи", tasks: [] };
      groups.push(current);
    }
    const numbered = /^(\d+(?:\.\d+)*\.?)[ \t]+(.+)$/.exec(item[2]);
    current.tasks.push({
      number: numbered?.[1] ?? "",
      title: numbered?.[2] ?? item[2],
      done: /^\s*x\s*$/i.test(item[1]),
    });
  }
  return groups.filter((group) => group.tasks.length);
}

export function progress(groups: TaskGroup[]) {
  const tasks = groups.flatMap((group) => group.tasks);
  return {
    done: tasks.filter((task) => task.done).length,
    total: tasks.length,
  };
}

export function changeTitle(id: string): string {
  const name = id.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/[-_]+/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function initialPrompt(
  action: Action,
  changeId: string,
  planningRoot?: string,
): string {
  const folder = `${planningRoot ? `${planningRoot}/` : ""}openspec/changes/${changeId}/`;
  const instruction = {
    explore:
      "Уточни открытые вопросы и подготовь недостающие артефакты OpenSpec. К реализации пока не переходи.",
    apply:
      "Выполняй незавершённые задачи из tasks.md. Обновляй отметки по мере завершения и выполняй указанные проверки. Если нужны решения пользователя, задай вопрос.",
    verify:
      "Сопоставь реализацию со спецификациями и tasks.md. Сообщи о расхождениях и результатах проверок. Не изменяй файлы.",
  }[action];
  return `${ACTION_LABEL[action]} изменение ${changeId}.\n\nПрочитай доступные артефакты в ${folder}: proposal.md, specs/, design.md и tasks.md. Следуй инструкциям проекта.\n\n${instruction}`;
}
