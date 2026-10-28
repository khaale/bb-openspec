import { pluginError } from "./plugin-error";
import path from "node:path";
import { artifactKinds } from "./model";

export function safeRelative(value: string): string {
  if (
    !value ||
    value.includes("\\") ||
    value.includes("\0") ||
    path.posix.isAbsolute(value) ||
    value
      .split("/")
      .some((segment) => segment === ".." || segment === "." || !segment)
  ) {
    throw pluginError("error.invalidPath");
  }
  return value;
}
export function changeRelative(changeId: string): string {
  safeRelative(changeId);
  const parts = changeId.split("/");
  if (
    !(parts.length === 1 && parts[0] !== "archive") &&
    !(parts.length === 2 && parts[0] === "archive")
  ) {
    throw pluginError("error.invalidChangeId");
  }
  return `changes/${changeId}`;
}
export function changeForPath(relative: string): string | null {
  const parts = relative.split("/");
  if (parts[0] !== "changes" || parts.length < 3) return null;
  if (parts[1] === "archive")
    return parts.length >= 4 ? `archive/${parts[2]}` : null;
  return parts[1];
}
export function artifactsFor(paths: string[], changeId: string) {
  const prefix = `${changeRelative(changeId)}/`;
  return artifactKinds.map((kind) => ({
    kind,
    paths: paths.filter((file) =>
      kind === "specs"
        ? file.startsWith(`${prefix}specs/`) && file.endsWith("/spec.md")
        : file === `${prefix}${kind}.md`,
    ),
  }));
}
