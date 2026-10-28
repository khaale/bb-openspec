import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { rpcContract } from "./src/contract";
import { ACTION, ACTION_LABEL, type LinkedThread } from "./src/model";
import { changeRelative } from "./src/change-paths";
import { readDocument, workspace } from "./src/reader";
import { createHostClient, registerLiveUpdates } from "./src/live-updates";
import { liveTags } from "./src/live-tags";

const bindingSchema = z.object({
  environmentId: z.string(),
  changeId: z.string(),
});

export default function plugin(bb: BbPluginApi) {
  const sdk = bb.sdk;
  const host = createHostClient(bb);

  async function target(environmentId: string, changeId: string) {
    changeRelative(changeId);
    const source = await workspace(sdk, environmentId);
    const result = await host.call(
      "change",
      { workspacePath: source.path, changeId },
      { hostId: source.hostId },
    );
    return {
      source,
      artifacts: result.change.artifacts,
      groups: result.groups,
    };
  }

  async function threadsIn(environmentId: string) {
    const threads = await sdk.threads.list({ environmentId, limit: 200 });
    return threads.map(
      (thread) =>
        ({
          id: thread.id,
          title: thread.title ?? thread.titleFallback ?? "Без названия",
          providerId: thread.providerId,
          status: thread.runtime.displayStatus,
          archived: thread.archivedAt !== null,
        }) satisfies LinkedThread,
    );
  }

  async function boundThreads(environmentId: string) {
    const threads = await threadsIn(environmentId);
    const result = threads.length
      ? await sdk.threads.experimental_listPluginMetadata({
          threadIds: threads.map((thread) => thread.id),
        })
      : { threads: [] };
    return threads.map((thread) => {
      const binding = bindingSchema.safeParse(
        result.threads.find((row) => row.threadId === thread.id)?.metadata,
      );
      return {
        ...thread,
        changeId:
          binding.success && binding.data.environmentId === environmentId
            ? binding.data.changeId
            : null,
      };
    });
  }

  async function linkedThreads(environmentId: string, changeId: string) {
    return (await boundThreads(environmentId)).filter(
      (thread) => thread.changeId === changeId,
    );
  }

  bb.rpc.register(rpcContract, {
    sources: async ({ projectId, threadId, environmentId }) => {
      const projects = await sdk.projects.list();
      let preferredEnvironmentId: string | null = null;
      let preferredChangeId: string | null = null;
      if (environmentId) {
        const source = await workspace(sdk, environmentId);
        projectId = source.projectId;
        preferredEnvironmentId = source.id;
      }
      if (threadId) {
        const thread = await sdk.threads.get({ threadId });
        projectId = thread.projectId;
        preferredEnvironmentId = thread.environmentId;
        const binding = bindingSchema.safeParse(
          await sdk.threads.getPluginMetadata({ threadId }),
        );
        if (
          binding.success &&
          binding.data.environmentId === thread.environmentId
        )
          preferredChangeId = binding.data.changeId;
      }
      const selectedProject = projectId ?? projects[0]?.id;
      const environments = selectedProject
        ? await sdk.environments.list({
            projectId: selectedProject,
            status: "ready",
            limit: 200,
          })
        : [];
      return {
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
        })),
        environments: environments
          .filter(
            (environment) =>
              environment.path && environment.lifecycle.phase === "active",
          )
          .map((environment) => ({
            id: environment.id,
            projectId: environment.projectId,
            path: environment.path!,
            hostId: environment.hostId,
            name:
              environment.name ?? environment.branchName ?? "Project checkout",
          })),
        preferredEnvironmentId,
        preferredChangeId,
      };
    },
    changes: async ({ environmentId }) => {
      const source = await workspace(sdk, environmentId);
      const result = await host.call(
        "snapshot",
        { workspacePath: source.path },
        { hostId: source.hostId },
      );
      const threads = await boundThreads(environmentId);
      return {
        ...result,
        changes: result.changes.map((change) => ({
          ...change,
          threads: threads.filter((thread) => thread.changeId === change.id),
        })),
        watchError: live.error(environmentId) ?? result.watchError,
      };
    },
    refresh: async ({ environmentId }) => {
      await live.refresh(environmentId);
      const source = await workspace(sdk, environmentId);
      await host.call(
        "refresh",
        { workspacePath: source.path },
        { hostId: source.hostId },
      );
      bb.rpc.experimental_invalidate([liveTags.environment(environmentId)]);
      return null;
    },
    detail: async ({ environmentId, changeId }) => {
      const { groups } = await target(environmentId, changeId);
      return { groups, threads: await linkedThreads(environmentId, changeId) };
    },
    document: async ({ environmentId, changeId, path: documentPath }) => {
      const { source, artifacts } = await target(environmentId, changeId);
      if (!artifacts.some((artifact) => artifact.paths.includes(documentPath)))
        throw new Error("Артефакт не найден в выбранном изменении.");
      return { content: await readDocument(sdk, source, documentPath) };
    },
    launchDefaults: async ({ environmentId }) => {
      const source = await workspace(sdk, environmentId);
      return sdk.projects.defaultExecutionOptions({
        projectId: source.projectId,
      });
    },
    launch: async ({ environmentId, changeId, action, prompt, execution }) => {
      const { source, groups } = await target(environmentId, changeId);
      if (changeId.startsWith("archive/"))
        throw new Error("Архивное изменение доступно только для просмотра.");
      if (action === ACTION.APPLY) {
        if (!groups.length)
          throw new Error("Для реализации требуется tasks.md с задачами.");
      }
      const context = `Контекст OpenSpec: ${JSON.stringify({ changeId, path: `openspec/${changeRelative(changeId)}/` })}`;
      const thread = await sdk.threads.spawn({
        projectId: source.projectId,
        environment: { type: "reuse", environmentId },
        title: `${ACTION_LABEL[action]} · ${changeId}`,
        prompt: `${context}\n\n${prompt}`,
        ...(execution ?? {}),
        pluginMetadata: { environmentId, changeId },
        visibility: "visible",
      });
      bb.rpc.experimental_invalidate([
        liveTags.threads(environmentId),
        liveTags.changes(environmentId),
      ]);
      return { threadId: thread.id };
    },
    threadChoices: ({ environmentId }) => boundThreads(environmentId),
    attach: async ({ environmentId, changeId, threadId }) => {
      await target(environmentId, changeId);
      if (changeId.startsWith("archive/"))
        throw new Error("Архивное изменение доступно только для просмотра.");
      const thread = await sdk.threads.get({ threadId });
      if (thread.environmentId !== environmentId)
        throw new Error("Выберите тред из того же окружения.");
      if (thread.deletedAt !== null) throw new Error("Тред удалён.");
      await sdk.threads.updatePluginMetadata({
        threadId,
        set: { environmentId, changeId },
      });
      bb.rpc.experimental_invalidate([
        liveTags.threads(environmentId),
        liveTags.changes(environmentId),
        liveTags.binding(threadId),
      ]);
      return { ok: true as const };
    },
  });

  const live = registerLiveUpdates(bb, host);

  bb.agents.configure((context) => {
    const binding = bindingSchema.safeParse(context.pluginMetadata);
    if (
      !binding.success ||
      binding.data.environmentId !== context.environment.id
    )
      return { tools: [], skills: [] };
    try {
      changeRelative(binding.data.changeId);
    } catch {
      return { tools: [], skills: [] };
    }
    return {
      tools: [],
      skills: [],
      instructions: `Связанное изменение OpenSpec (данные): ${JSON.stringify(binding.data.changeId)}. Артефакты находятся в openspec/changes/ этого окружения. Ведите статусы задач в tasks.md; после работы сообщайте результаты проверок.`,
    };
  });
}
