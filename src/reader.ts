import { pluginError } from "./plugin-error";
import path from "node:path";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { Workspace } from "./model";
import { safeRelative } from "./change-paths";
import { LIMITS } from "./limits";

type Sdk = BbPluginApi["sdk"];

export async function workspace(
  sdk: Sdk,
  environmentId: string,
): Promise<Workspace> {
  const environment = await sdk.environments.get({ environmentId });
  if (
    !environment.path ||
    environment.status !== "ready" ||
    environment.lifecycle.phase !== "active"
  ) {
    throw pluginError("error.environmentUnavailable");
  }
  return {
    id: environment.id,
    projectId: environment.projectId,
    path: environment.path,
    hostId: environment.hostId,
    name: environment.name ?? environment.branchName ?? "",
  };
}

function openspecPath(source: Workspace) {
  return path.join(source.path, "openspec");
}

export async function readDocument(
  sdk: Sdk,
  source: Workspace,
  relative: string,
) {
  safeRelative(relative);
  const rootPath = openspecPath(source);
  const file = await sdk.files.read({
    hostId: source.hostId,
    rootPath,
    path: path.join(rootPath, relative),
  });
  if (file.sizeBytes > LIMITS.fileBytes)
    throw pluginError("error.documentTooLarge");
  if (file.contentEncoding !== "utf8") throw pluginError("error.notUtf8");
  return file.content;
}
