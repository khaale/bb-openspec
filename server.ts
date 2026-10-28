import { LANGUAGE_OPTIONS, LANGUAGE_OPTION_LABELS } from "./src/messages";
import { pluginError } from "./src/plugin-error";
import path from "node:path";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { rpcContract } from "./src/contract";
import { ACTION, ACTION_LABEL, type LinkedThread } from "./src/model";
import { changeRelative } from "./src/change-paths";
import { readDocument, workspace } from "./src/reader";
import { createHostClient, registerLiveUpdates } from "./src/live-updates";
import { liveTags } from "./src/live-tags";
import { storeIdSchema } from "./src/planning-source";
import { compareChanges } from "./src/change-order";

const bindingSchema = z.object({
  environmentId: z.string(),
  changeId: z.string(),
  storeId: storeIdSchema.nullable().default(null),
});

export default function plugin(bb: BbPluginApi) {
  const sdk = bb.sdk;
  const host = createHostClient(bb);
  bb.settings.define({
    language: {
      type: "select",
      label: "Language",
      description:
        "Plugin interface language. Auto follows this browser.",
      options: LANGUAGE_OPTIONS,
      experimental_optionLabels: LANGUAGE_OPTION_LABELS,
      default: "auto",
    },
  });

  async function planning(environmentId: string, storeId?: string | null) {
    const source = await workspace(sdk, environmentId);
    const selected = await host.call(
      "resolve",
      {
        workspacePath: source.path,
        ...(storeId !== undefined ? { storeId } : {}),
      },
      { hostId: source.hostId },
    );
    return { source, selected };
  }

  async function target(
    environmentId: string,
    changeId: string,
    storeId?: string | null,
  ) {
    changeRelative(changeId);
    const { source, selected } = await planning(environmentId, storeId);
    const result = await host.call(
      "change",
      { workspacePath: selected.rootPath, storeId: null, changeId },
      { hostId: source.hostId },
    );
    return {
      source,
      selected,
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
          title: thread.title ?? thread.titleFallback ?? "",
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
        storeId: binding.success ? binding.data.storeId : null,
        changeId:
          binding.success && binding.data.environmentId === environmentId
            ? binding.data.changeId
            : null,
      };
    });
  }

  async function linkedThreads(
    environmentId: string,
    changeId: string,
    storeId: string | null,
  ) {
    return (await boundThreads(environmentId)).filter(
      (thread) => thread.changeId === changeId && thread.storeId === storeId,
    );
  }

  bb.rpc.register(rpcContract, {
    sources: async ({ projectId, threadId, environmentId }) => {
      const projects = await sdk.projects.list();
      let preferredEnvironmentId: string | null = null;
      let preferredChangeId: string | null = null;
      let preferredStoreId: string | null = null;
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
        ) {
          preferredChangeId = binding.data.changeId;
          preferredStoreId = binding.data.storeId;
        }
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
            name: environment.name ?? environment.branchName ?? "",
          })),
        preferredEnvironmentId,
        preferredChangeId,
        preferredStoreId,
      };
    },
    planningSources: async ({ environmentId }) => {
      const source = await workspace(sdk, environmentId);
      return host.call(
        "catalog",
        { workspacePath: source.path },
        { hostId: source.hostId },
      );
    },
    changes: async ({ environmentId, storeId }) => {
      const { source, selected } = await planning(environmentId, storeId);
      const result = await host.call(
        "snapshot",
        { workspacePath: selected.rootPath, storeId: null },
        { hostId: source.hostId },
      );
      const threads = await boundThreads(environmentId);
      return {
        ...result,
        source: selected,
        changes: result.changes
          .map((change) => ({
            ...change,
            threads: threads.filter(
              (thread) =>
                thread.changeId === change.id &&
                thread.storeId === selected.storeId,
            ),
          }))
          .sort(compareChanges),
        watchError: live.error(environmentId, storeId) ?? result.watchError,
      };
    },
    refresh: async ({ environmentId, storeId }) => {
      const source = await workspace(sdk, environmentId);
      await host.call(
        "refresh",
        {
          workspacePath: source.path,
          ...(storeId !== undefined ? { storeId } : {}),
        },
        { hostId: source.hostId },
      );
      await live.refresh(environmentId);
      bb.rpc.experimental_invalidate([liveTags.environment(environmentId)]);
      return null;
    },
    detail: async ({ environmentId, changeId, storeId }) => {
      const { groups, selected } = await target(
        environmentId,
        changeId,
        storeId,
      );
      return {
        groups,
        threads: await linkedThreads(environmentId, changeId, selected.storeId),
      };
    },
    document: async ({
      environmentId,
      changeId,
      storeId,
      path: documentPath,
    }) => {
      const { source, selected, artifacts } = await target(
        environmentId,
        changeId,
        storeId,
      );
      if (!artifacts.some((artifact) => artifact.paths.includes(documentPath)))
        throw pluginError("error.artifactNotFound");
      return {
        content: await readDocument(
          sdk,
          { ...source, path: selected.rootPath },
          documentPath,
        ),
        absolutePath: path.join(selected.rootPath, "openspec", documentPath),
      };
    },
    launchDefaults: async ({ environmentId }) => {
      const source = await workspace(sdk, environmentId);
      return sdk.projects.defaultExecutionOptions({
        projectId: source.projectId,
      });
    },
    launch: async ({
      environmentId,
      changeId,
      storeId,
      action,
      prompt,
      execution,
    }) => {
      const { source, selected, groups } = await target(
        environmentId,
        changeId,
        storeId,
      );
      if (changeId.startsWith("archive/"))
        throw pluginError("error.archivedReadOnly");
      if (action === ACTION.APPLY) {
        if (!groups.length) throw pluginError("error.tasksRequired");
      }
      const context = `OpenSpec context: ${JSON.stringify({ changeId, storeId: selected.storeId, planningRoot: selected.rootPath, changePath: path.join(selected.rootPath, "openspec", changeRelative(changeId)), executionPath: source.path })}.\n${selected.storeId ? `For OpenSpec workflow commands, use --store ${JSON.stringify(selected.storeId)}. References are read-only context. Do not create a local copy of this change.` : "Use the specified local planningRoot."}\nReferences declared in OpenSpec configuration are read-only upstream context; retrieve them through standard CLI workflow instructions.`;
      const thread = await sdk.threads.spawn({
        projectId: source.projectId,
        environment: { type: "reuse", environmentId },
        title: `${ACTION_LABEL[action]} · ${changeId}`,
        prompt: `${context}\n\n${prompt}`,
        ...(execution ?? {}),
        pluginMetadata: { environmentId, changeId, storeId: selected.storeId },
        visibility: "visible",
      });
      bb.rpc.experimental_invalidate([
        liveTags.threads(environmentId),
        liveTags.changes(environmentId),
      ]);
      return { threadId: thread.id };
    },
    threadChoices: ({ environmentId }) => boundThreads(environmentId),
    attach: async ({ environmentId, changeId, storeId, threadId }) => {
      const { selected } = await target(environmentId, changeId, storeId);
      if (changeId.startsWith("archive/"))
        throw pluginError("error.archivedReadOnly");
      const thread = await sdk.threads.get({ threadId });
      if (thread.environmentId !== environmentId)
        throw pluginError("error.threadEnvironment");
      if (thread.deletedAt !== null) throw pluginError("error.threadDeleted");
      await sdk.threads.updatePluginMetadata({
        threadId,
        set: { environmentId, changeId, storeId: selected.storeId },
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
      instructions: `Linked OpenSpec change (data): ${JSON.stringify(binding.data.changeId)}. ${binding.data.storeId ? `Planning source: store ${JSON.stringify(binding.data.storeId)}. Run openspec context --store ${JSON.stringify(binding.data.storeId)} --json to resolve its root; pass the same --store to all workflow commands. Artifacts are in openspec/changes/ under the store root, not in the code checkout. Do not create a local duplicate. References are read-only context.` : "Artifacts are in openspec/changes/ in this environment."} References declared in OpenSpec configuration are read-only and available through standard CLI workflow instructions. Follow the project instructions and required artifact language. Maintain task status in tasks.md and report verification results.`,
    };
  });
}
