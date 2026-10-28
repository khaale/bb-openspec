export const liveTags = {
  specifications: (environmentId: string) => `openspec:specifications:${environmentId}`,
  specification: (environmentId: string, capabilityId: string) => `openspec:specification:${environmentId}:${capabilityId}`,
  binding: (threadId: string) => `openspec:binding:${threadId}`,
  environment: (environmentId: string) =>
    `openspec:environment:${environmentId}`,
  changes: (environmentId: string) => `openspec:changes:${environmentId}`,
  detail: (environmentId: string, changeId: string) =>
    `openspec:detail:${environmentId}:${changeId}`,
  document: (environmentId: string, file: string) =>
    `openspec:document:${environmentId}:${file}`,
  threads: (environmentId: string) => `openspec:threads:${environmentId}`,
};
