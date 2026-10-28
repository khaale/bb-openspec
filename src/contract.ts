import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  actionSchema,
  changeSchema,
  environmentSchema,
  executionSchema,
  groupSchema,
  targetSchema,
  threadSchema,
} from "./model";

import { snapshotSchema } from "./host-contract";
import { liveTags } from "./live-tags";

export const rpcContract = defineRpcContract({
  sources: {
    tags: (input) => (input.threadId ? [liveTags.binding(input.threadId)] : []),
    input: z.object({
      projectId: z.string().optional(),
      threadId: z.string().optional(),
      environmentId: z.string().optional(),
    }),
    output: z.object({
      projects: z.array(z.object({ id: z.string(), name: z.string() })),
      environments: z.array(environmentSchema),
      preferredEnvironmentId: z.string().nullable(),
      preferredChangeId: z.string().nullable(),
    }),
  },
  changes: {
    input: z.object({ environmentId: z.string() }),
    output: snapshotSchema.extend({
      changes: z.array(changeSchema.extend({ threads: z.array(threadSchema) })),
    }),
    tags: (input) => [
      liveTags.environment(input.environmentId),
      liveTags.changes(input.environmentId),
    ],
  },
  refresh: { input: z.object({ environmentId: z.string() }), output: z.null() },
  detail: {
    input: targetSchema,
    tags: (input) => [
      liveTags.environment(input.environmentId),
      liveTags.detail(input.environmentId, input.changeId),
      liveTags.threads(input.environmentId),
    ],
    output: z.object({
      groups: z.array(groupSchema),
      threads: z.array(threadSchema),
    }),
  },
  document: {
    input: targetSchema.extend({ path: z.string().max(1000) }),
    output: z.object({ content: z.string() }),
    tags: (input) => [
      liveTags.environment(input.environmentId),
      liveTags.document(input.environmentId, input.path),
    ],
  },
  launchDefaults: {
    input: z.object({ environmentId: z.string() }),
    output: executionSchema.nullable(),
  },
  launch: {
    input: targetSchema.extend({
      action: actionSchema,
      prompt: z.string().trim().min(1).max(32000),
      execution: executionSchema.nullable(),
    }),
    output: z.object({ threadId: z.string() }),
  },
  threadChoices: {
    input: z.object({ environmentId: z.string() }),
    output: z.array(threadSchema.extend({ changeId: z.string().nullable() })),
  },
  attach: {
    input: targetSchema.extend({ threadId: z.string() }),
    output: z.object({ ok: z.literal(true) }),
  },
});
