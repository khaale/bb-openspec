import {
  Children,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  definePluginApp,
  useBbContext,
  useBbNavigate,
  useRpc,
  experimental_useRpcQuery as useRpcQuery,
  Markdown,
  experimental_ProviderModelPicker as ProviderModelPicker,
  experimental_PermissionModePicker as PermissionModePicker,
  type ExperimentalProviderModelPickerValue,
  type PluginNavPanelProps,
} from "@get-bb/plugin-sdk/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { rpcContract } from "./src/contract";
import type { PlanningSource } from "./src/planning-source";
import {
  ACTION,
  initialPrompt,
  progress,
  type Action,
  type Change,
  type LinkedThread,
  type Workspace,
} from "./src/model";
import { useQuery, liveQueryView } from "./src/use-query";
import { errorMessage } from "./src/reader-error";
import { I18nProvider, useI18n } from "./src/i18n-react";
import { localizedError } from "./src/plugin-error";
import type { MessageKey } from "./src/i18n";
import "./style.css";

type Rpc = ReturnType<typeof useRpc<typeof rpcContract>>;
const VIEW = { TASKS: "tasks", THREADS: "threads" } as const;
type View = (typeof VIEW)[keyof typeof VIEW];

function Message({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  const { locale } = useI18n();
  return (
    <div
      className={`os-message${error ? " os-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {Children.map(children, (child) =>
        typeof child === "string" ? localizedError(child, locale) : child,
      )}
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 3v5h-5M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8M21 12a9 9 0 0 1-15.4 6.4L3 16" />
    </svg>
  );
}

function ViewModeIcon({ compact }: { compact: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {compact ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
        </>
      ) : (
        <>
          <rect x="4" y="3" width="16" height="4" rx="1" />
          <rect x="4" y="10" width="16" height="4" rx="1" />
          <rect x="4" y="17" width="16" height="4" rx="1" />
        </>
      )}
    </svg>
  );
}

function Hint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const { t, percent: formatPercent } = useI18n();
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="os-ring" aria-label={t("progressLabel", { done, total })}>
      <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <circle cx="26" cy="26" r="22" className="os-track" />
        <circle
          cx="26"
          cy="26"
          r="22"
          className="os-progress"
          strokeDasharray={`${percent * 1.382} 138.2`}
        />
      </svg>
      <span>{total ? formatPercent(done / total) : "—"}</span>
    </div>
  );
}

function LaunchDialog({
  rpc,
  source,
  planningSource,
  change,
  onClose,
  onLaunched,
}: {
  rpc: Rpc;
  source: Workspace;
  planningSource: PlanningSource;
  change: Change;
  onClose: () => void;
  onLaunched: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const [action, setAction] = useState<Action>(
    change.total ? ACTION.APPLY : ACTION.EXPLORE,
  );
  const [prompt, setPrompt] = useState(() =>
    initialPrompt(action, change.id, planningSource.rootPath),
  );
  const [execution, setExecution] =
    useState<ExperimentalProviderModelPickerValue | null>(null);
  const [permissionMode, setPermissionMode] = useState<
    "auto" | "accept-edits" | "full"
  >("auto");
  const [custom, setCustom] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const defaultsLoad = useCallback(
    () => rpc.call("launchDefaults", { environmentId: source.id }),
    [rpc, source.id],
  );
  const defaults = useQuery(defaultsLoad);
  useEffect(() => {
    if (defaults.data && !custom) {
      setExecution(defaults.data);
      setPermissionMode(defaults.data.permissionMode);
    }
  }, [defaults.data, custom]);
  const routing = { kind: "environment" as const, environmentId: source.id };
  async function launch() {
    if (pending || !prompt.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await rpc.call("launch", {
        environmentId: source.id,
        changeId: change.id,
        storeId: planningSource.storeId,
        action,
        prompt,
        execution:
          custom && execution
            ? {
                providerId: execution.providerId,
                model: execution.model,
                reasoningLevel: execution.reasoningLevel,
                ...(execution.serviceTier !== undefined
                  ? { serviceTier: execution.serviceTier }
                  : {}),
                permissionMode,
              }
            : null,
      });
      onLaunched(result.threadId);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="os-dialog" lang={locale}>
        <DialogHeader>
          <DialogTitle>{t("newThread")}</DialogTitle>
          <DialogDescription className="os-mono">{change.id}</DialogDescription>
        </DialogHeader>
        <div className="os-modes">
          {Object.values(ACTION).map((value) => (
            <Button
              key={value}
              variant="outline"
              disabled={pending || (value === ACTION.APPLY && !change.total)}
              aria-pressed={action === value}
              onClick={() => {
                setAction(value);
                setPrompt(
                  initialPrompt(value, change.id, planningSource.rootPath),
                );
              }}
            >
              {t(`action.${value}`)}
              <small>
                {
                  {
                    explore: t("actionHint.explore"),
                    apply: t("actionHint.apply"),
                    verify: t("actionHint.verify"),
                  }[value]
                }
              </small>
            </Button>
          ))}
        </div>
        <div className="os-launch-context">
          <span>{source.name || t("projectCheckout")}</span>
          <span className="os-mono">{source.path}</span>
          {planningSource.storeId && (
            <span className="os-mono">
              Store {planningSource.storeId}: {planningSource.rootPath}
            </span>
          )}
        </div>
        <div className="os-agent-settings">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            aria-pressed={custom}
            onClick={() => {
              setCustom((value) => !value);
              if (!execution)
                setExecution({ providerId: "", model: "", reasoningLevel: "" });
            }}
          >
            {custom ? t("customAgentSettings") : t("bbDefaults")}
          </Button>
          {custom && execution && (
            <div className="os-pickers">
              <ProviderModelPicker
                value={execution}
                onChange={setExecution}
                routing={routing}
                disabled={pending}
              />
              <PermissionModePicker
                providerId={execution.providerId}
                value={permissionMode}
                onChange={setPermissionMode}
                routing={routing}
                disabled={pending}
              />
            </div>
          )}
        </div>
        <label className="os-field" htmlFor="os-prompt">
          {t("firstMessage")}
        </label>
        <textarea
          id="os-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={pending}
          rows={7}
          maxLength={32000}
        />
        {error && <Message error>{error}</Message>}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            className="os-primary"
            disabled={
              pending || !prompt.trim() || (custom && !execution?.providerId)
            }
            onClick={() => void launch()}
          >
            {pending ? t("launching") : t("createAndLaunch")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttachDialog({
  rpc,
  source,
  planningSource,
  change,
  onClose,
  onAttached,
}: {
  rpc: Rpc;
  source: Workspace;
  planningSource: PlanningSource;
  change: Change;
  onClose: () => void;
  onAttached: () => void;
}) {
  const { t, locale } = useI18n();
  const [threadId, setThreadId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const load = useCallback(
    () => rpc.call("threadChoices", { environmentId: source.id }),
    [rpc, source.id],
  );
  const choices = useQuery(load);
  const previousChoice = choices.data?.find((thread) => thread.id === threadId);
  const previousChange = previousChoice?.changeId;
  const replacing =
    !!previousChange &&
    (previousChange !== change.id ||
      previousChoice?.storeId !== planningSource.storeId);
  async function attach() {
    if (pending || !threadId) return;
    setPending(true);
    setError(undefined);
    try {
      await rpc.call("attach", {
        environmentId: source.id,
        changeId: change.id,
        storeId: planningSource.storeId,
        threadId,
      });
      onAttached();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="os-dialog" lang={locale}>
        <DialogHeader>
          <DialogTitle>{t("attachThread")}</DialogTitle>
          <DialogDescription>
            {change.title} · {source.name || t("projectCheckout")}
          </DialogDescription>
        </DialogHeader>
        {choices.error && <Message error>{choices.error}</Message>}
        {!choices.data && !choices.error && (
          <Message>{t("loadingThreads")}</Message>
        )}
        {choices.data &&
          (choices.data.length ? (
            <select
              aria-label={t("thread")}
              value={threadId}
              onChange={(event) => setThreadId(event.target.value)}
              disabled={pending}
            >
              <option value="">{t("chooseThread")}</option>
              {choices.data.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.title || t("untitled")} · {thread.providerId} ·{" "}
                  {thread.id.slice(-6)}
                  {thread.changeId
                    ? ` → ${thread.storeId ? `${thread.storeId}/` : ""}${thread.changeId}`
                    : ""}
                </option>
              ))}
            </select>
          ) : (
            <Message>{t("noThreads")}</Message>
          ))}
        {replacing && (
          <p className="os-link-notice">
            {t("replaceBinding", {
              previous: `${previousChoice?.storeId ? `${previousChoice.storeId}/` : ""}${previousChange}`,
              next: change.id,
            })}
          </p>
        )}
        {error && <Message error>{error}</Message>}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={pending || !threadId} onClick={() => void attach()}>
            {pending ? t("linking") : replacing ? t("relink") : t("link")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const THREAD_STATUS: Record<string, MessageKey> = {
  active: "status.active",
  idle: "status.idle",
  error: "status.error",
  pending: "status.pending",
  starting: "status.starting",
  provisioning: "status.provisioning",
  stopping: "status.stopping",
  "waiting-for-host": "status.waiting-for-host",
};

function ThreadIndicator({ threads }: { threads: LinkedThread[] }) {
  const { t, number } = useI18n();
  const running = threads.find((thread) => thread.status === "active");
  const attention = threads.find((thread) => thread.status === "error");
  const queued = threads.find((thread) =>
    ["pending", "starting", "provisioning", "waiting-for-host"].includes(
      thread.status,
    ),
  );
  const thread = running ?? attention ?? queued ?? threads[0];
  if (!thread) return null;
  return (
    <span
      className={`os-thread-indicator${running ? " os-running" : ""}${attention && !running ? " os-thread-error" : ""}`}
      title={thread.title || t("untitled")}
    >
      <i aria-hidden="true" />
      {running
        ? t("agentWorking")
        : thread.status === "idle"
          ? t("agentIdle")
          : THREAD_STATUS[thread.status]
            ? t(THREAD_STATUS[thread.status])
            : thread.status}
      {threads.length > 1 ? ` · ${number(threads.length)}` : ""}
    </span>
  );
}

function ChangeDetail({
  rpc,
  source,
  planningSource,
  change,
  onRefresh,
}: {
  rpc: Rpc;
  source: Workspace;
  planningSource: PlanningSource;
  change: Change;
  onRefresh: () => void;
}) {
  const { t, number, specCount, taskCount, locale } = useI18n();
  const navigate = useBbNavigate();
  const [view, setView] = useState<View>(VIEW.TASKS);
  const [documentPath, setDocumentPath] = useState<string>();
  const [dialog, setDialog] = useState<"launch" | "attach">();
  const detail = liveQueryView(
    useRpcQuery({
      contract: rpcContract,
      method: "detail",
      input: {
        environmentId: source.id,
        changeId: change.id,
        storeId: planningSource.storeId,
      },
    }),
  );
  const documentQuery = liveQueryView(
    useRpcQuery({
      contract: rpcContract,
      method: "document",
      input: {
        environmentId: source.id,
        changeId: change.id,
        storeId: planningSource.storeId,
        path: documentPath ?? "",
      },
      enabled: !!documentPath,
    }),
  );
  const counts = detail.data ? progress(detail.data.groups) : change;
  const documentKind = change.artifacts.find((artifact) =>
    artifact.paths.includes(documentPath ?? ""),
  );
  const state = change.archived
    ? t("archived")
    : !counts.total
      ? t("preparingArtifacts")
      : counts.done === counts.total
        ? t("tasksComplete")
        : `${number(counts.done)} / ${taskCount(counts.total)}`;
  return (
    <main className="os-main">
      <div className="os-breadcrumb">changes / {change.id}</div>
      <div className="os-hero">
        <div>
          <h1>{change.title}</h1>
          <span className="os-state">{state}</span>
        </div>
        <ProgressRing done={counts.done} total={counts.total} />
      </div>
      <div className="os-actions">
        <Button
          className="os-primary"
          size="sm"
          disabled={change.archived}
          onClick={() => setDialog("launch")}
        >
          <Icon name="Play" />
          {t("launchAgent")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={change.archived}
          onClick={() => setDialog("attach")}
        >
          <Icon name="Plus" />
          {t("attachThread")}
        </Button>
      </div>
      <div className="os-artifacts">
        {change.artifacts.map((artifact) => (
          <button
            key={artifact.kind}
            className={`os-artifact${artifact.paths.length ? "" : " os-missing"}`}
            disabled={!artifact.paths.length}
            aria-pressed={documentKind?.kind === artifact.kind}
            onClick={() => setDocumentPath(artifact.paths[0])}
          >
            <span aria-hidden="true" className="os-artifact-icon">
              {artifact.paths.length ? "✓" : "○"}
            </span>
            <b>{t(`artifact.${artifact.kind}`)}</b>
            <small>
              {artifact.paths.length
                ? artifact.kind === "specs"
                  ? specCount(artifact.paths.length)
                  : t("fileExists")
                : t("fileMissing")}
            </small>
          </button>
        ))}
      </div>
      <div className="os-tabs" role="tablist" aria-label={t("changeContents")}>
        <button
          role="tab"
          aria-selected={!documentPath && view === VIEW.TASKS}
          onClick={() => {
            setDocumentPath(undefined);
            setView(VIEW.TASKS);
          }}
        >
          {t("tasks")}{" "}
          <em>
            {number(counts.done)}/{number(counts.total)}
          </em>
        </button>
        <button
          role="tab"
          aria-selected={!documentPath && view === VIEW.THREADS}
          onClick={() => {
            setDocumentPath(undefined);
            setView(VIEW.THREADS);
          }}
        >
          {t("threads")} <em>{number(detail.data?.threads.length ?? 0)}</em>
        </button>
        {documentKind && (
          <span className="os-doc-label">
            {t(`artifact.${documentKind.kind}`)}
          </span>
        )}
        <Hint label={t("refreshChange")}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("refreshChange")}
            className="os-refresh"
            onClick={() => {
              detail.refresh();
              documentQuery.refresh();
              onRefresh();
            }}
          >
            <RefreshIcon />
          </Button>
        </Hint>
      </div>
      {change.error && <Message error>{change.error}</Message>}
      {detail.error && (
        <Message error>
          {detail.error}
          <Button variant="link" size="sm" onClick={detail.refresh}>
            {t("retry")}
          </Button>
        </Message>
      )}
      {documentPath ? (
        <section className="os-document">
          {documentKind?.kind === "specs" && (
            <select
              aria-label={t("specification")}
              value={documentPath}
              onChange={(event) => setDocumentPath(event.target.value)}
            >
              {documentKind.paths.map((file) => (
                <option key={file} value={file}>
                  {file.split("/specs/")[1]?.replace(/\/spec.md$/, "")}
                </option>
              ))}
            </select>
          )}
          <div className="os-document-heading">
            <span className="os-mono">{documentPath}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!documentQuery.data}
              onClick={() =>
                documentQuery.data &&
                navigate.experimental_openFilePreview({
                  target: {
                    kind: "host",
                    hostId: source.hostId,
                    path: documentQuery.data.absolutePath,
                  },
                  location: null,
                })
              }
            >
              {t("openFile")}
            </Button>
          </div>
          {documentQuery.error && (
            <Message error>{documentQuery.error}</Message>
          )}
          {!documentQuery.data && !documentQuery.error && (
            <Message>{t("loadingDocument")}</Message>
          )}
          {documentQuery.data && (
            <Markdown content={documentQuery.data.content} />
          )}
        </section>
      ) : (
        <section role="tabpanel">
          {!detail.data && !detail.error && <Message>{t("loading")}</Message>}
          {detail.data &&
            view === VIEW.TASKS &&
            (detail.data.groups.length ? (
              detail.data.groups.map((group, index) => (
                <section key={`${index}-${group.title}`} className="os-group">
                  <h2>
                    <span className="os-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {group.title
                      ? group.title.replace(/^\d+\.\s*/, "")
                      : t("tasks")}
                    <small>
                      {number(group.tasks.filter((task) => task.done).length)} /{" "}
                      {number(group.tasks.length)}
                    </small>
                  </h2>
                  <ul>
                    {group.tasks.map((task, taskIndex) => (
                      <li
                        key={taskIndex}
                        className={`os-task${task.done ? " os-done" : ""}`}
                      >
                        <span
                          className="os-task-status"
                          role="img"
                          aria-label={
                            task.done ? t("completed") : t("notCompleted")
                          }
                        >
                          {task.done ? "✓" : "○"}
                        </span>
                        <span>
                          {task.number && <code>{task.number}</code>}
                          {task.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <Message>
                {t("noTasksYet")}
                {!change.archived && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setDialog("launch")}
                  >
                    {t("exploreWithAgent")}
                  </Button>
                )}
              </Message>
            ))}
          {detail.data &&
            view === VIEW.THREADS &&
            (detail.data.threads.length ? (
              detail.data.threads.map((thread) => (
                <button
                  key={thread.id}
                  className="os-thread"
                  onClick={() => navigate.toThread(thread.id)}
                >
                  <span className="os-avatar">↗</span>
                  <span>
                    <strong>{thread.title || t("untitled")}</strong>
                    <small>
                      {thread.providerId} ·{" "}
                      {THREAD_STATUS[thread.status]
                        ? t(THREAD_STATUS[thread.status])
                        : thread.status}
                      {thread.archived ? t("archiveSuffix") : ""}
                    </small>
                  </span>
                  <span className="os-thread-arrow">↗</span>
                </button>
              ))
            ) : (
              <Message>{t("noLinkedThreads")}</Message>
            ))}
        </section>
      )}
      {dialog === "launch" && (
        <LaunchDialog
          rpc={rpc}
          source={source}
          planningSource={planningSource}
          change={change}
          onClose={() => setDialog(undefined)}
          onLaunched={(id) => {
            setDialog(undefined);
            detail.refresh();
            navigate.toThread(id);
          }}
        />
      )}
      {dialog === "attach" && (
        <AttachDialog
          rpc={rpc}
          source={source}
          planningSource={planningSource}
          change={change}
          onClose={() => setDialog(undefined)}
          onAttached={() => {
            setDialog(undefined);
            setView(VIEW.THREADS);
            setDocumentPath(undefined);
            detail.refresh();
          }}
        />
      )}
    </main>
  );
}

function OpenSpecPage({
  subPath = "",
  threadId,
}: {
  subPath?: string;
  threadId?: string;
}) {
  const { t, number, taskCount, locale } = useI18n();
  const context = useBbContext();
  const rpc = useRpc<typeof rpcContract>();
  const [routeEnvironment, ...routeChangeParts] = subPath.split("/");
  const routeChange = routeChangeParts.join("/");
  const [projectId, setProjectId] = useState<string>();
  const [environmentId, setEnvironmentId] = useState<string>();
  const [changeId, setChangeId] = useState<string>();
  const [storeId, setStoreId] = useState<string | null>();
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [editingSource, setEditingSource] = useState(false);
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem("openspec:compact") === "true";
    } catch {
      return false;
    }
  });
  const [compactDetail, setCompactDetail] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("openspec:compact", String(compact));
    } catch {}
  }, [compact]);
  const sources = liveQueryView(
    useRpcQuery({
      contract: rpcContract,
      method: "sources",
      input: {
        ...((projectId ?? context.projectId)
          ? { projectId: (projectId ?? context.projectId)! }
          : {}),
        ...(threadId ? { threadId } : {}),
        ...(!projectId && routeEnvironment
          ? { environmentId: routeEnvironment }
          : {}),
      },
    }),
  );
  useEffect(() => {
    if (threadId) {
      setChangeId(undefined);
      setStoreId(undefined);
      setArchived(false);
    }
  }, [
    threadId,
    sources.data?.preferredChangeId,
    sources.data?.preferredStoreId,
  ]);
  const source =
    sources.data?.environments.find(
      (environment) => environment.id === environmentId,
    ) ??
    sources.data?.environments.find(
      (environment) => environment.id === sources.data?.preferredEnvironmentId,
    ) ??
    sources.data?.environments[0];
  const selectedStoreId =
    storeId !== undefined
      ? storeId
      : threadId && sources.data?.preferredChangeId
        ? sources.data.preferredStoreId
        : undefined;
  const sourceSelection =
    selectedStoreId !== undefined ? { storeId: selectedStoreId } : {};
  const planningSources = liveQueryView(
    useRpcQuery({
      contract: rpcContract,
      method: "planningSources",
      input: { environmentId: source?.id ?? "" },
      enabled: !!source,
    }),
  );
  const changes = liveQueryView(
    useRpcQuery({
      contract: rpcContract,
      method: "changes",
      input: { environmentId: source?.id ?? "", ...sourceSelection },
      enabled: !!source,
    }),
  );
  const [refreshError, setRefreshError] = useState<string>();
  const refreshFiles = useCallback(() => {
    if (!source) return;
    setRefreshError(undefined);
    void rpc
      .call("refresh", { environmentId: source.id, ...sourceSelection })
      .then(changes.refresh, (cause) => setRefreshError(errorMessage(cause)));
  }, [rpc, source?.id, selectedStoreId, changes.refresh]);
  const preferredId =
    changeId ?? (routeChange || sources.data?.preferredChangeId);
  const effectiveArchived =
    changeId === undefined && preferredId?.startsWith("archive/")
      ? true
      : archived;
  const selected =
    changes.data?.changes.find(
      (change) =>
        change.id === preferredId && change.archived === effectiveArchived,
    ) ??
    changes.data?.changes.find(
      (change) => change.archived === effectiveArchived,
    );
  const matching =
    changes.data?.changes.filter(
      (change) =>
        change.archived === effectiveArchived &&
        `${change.title} ${change.id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) ?? [];
  const activeCount =
    changes.data?.changes.filter((change) => !change.archived).length ?? 0;
  const archiveCount =
    changes.data?.changes.filter((change) => change.archived).length ?? 0;
  const selectedProjectId =
    source?.projectId ??
    projectId ??
    context.projectId ??
    sources.data?.projects[0]?.id;
  const projectName =
    sources.data?.projects.find((project) => project.id === selectedProjectId)
      ?.name ?? t("chooseProject");
  const displayedStoreId = changes.data?.source.storeId ?? selectedStoreId;
  const sourceLabel = source
    ? `${projectName} · ${source.name || t("projectCheckout")}${displayedStoreId ? ` · store: ${displayedStoreId}` : ""}`
    : projectName;
  return (
    <TooltipProvider delayDuration={350}>
      <div className="os-root" lang={locale}>
        <header
          className="os-top"
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditingSource(false);
          }}
        >
          <Hint
            label={`${sourceLabel} — ${editingSource ? t("collapseSelection") : t("changeContext")}`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="os-source-summary"
              aria-label={t("projectEnvironment", { source: sourceLabel })}
              aria-expanded={editingSource}
              onClick={() => setEditingSource((value) => !value)}
            >
              <span className="os-source-name">{projectName}</span>
              {displayedStoreId ? (
                <span className="os-source-store">· {displayedStoreId}</span>
              ) : (
                source && (
                  <span className="os-source-environment">
                    · {source.name || t("projectCheckout")}
                  </span>
                )
              )}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
                className={editingSource ? "os-chevron-open" : ""}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </Hint>
          <Hint label={compact ? t("showDetails") : t("showCards")}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={compact ? t("showDetails") : t("showCards")}
              aria-pressed={compact}
              className="os-view-toggle"
              onClick={() => {
                setCompact((value) => !value);
                setCompactDetail(false);
              }}
            >
              <ViewModeIcon compact={compact} />
            </Button>
          </Hint>
          <Hint label={t("refreshOpenSpec")}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("refreshOpenSpec")}
              className="os-reload"
              onClick={() => {
                sources.refresh();
                refreshFiles();
              }}
            >
              <RefreshIcon />
            </Button>
          </Hint>
          {editingSource && (
            <div className="os-source-pickers">
              <select
                aria-label={t("project")}
                value={
                  source?.projectId ??
                  projectId ??
                  context.projectId ??
                  sources.data?.projects[0]?.id ??
                  ""
                }
                disabled={!!threadId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setStoreId(undefined);
                  setEnvironmentId(undefined);
                  setChangeId(undefined);
                  setArchived(false);
                }}
              >
                {!sources.data && <option>{t("loading")}</option>}
                {sources.data?.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("environment")}
                value={source?.id ?? ""}
                disabled={!!threadId || !sources.data?.environments.length}
                onChange={(event) => {
                  setEnvironmentId(event.target.value);
                  setStoreId(undefined);
                  setChangeId(undefined);
                  setArchived(false);
                }}
              >
                {!sources.data?.environments.length && (
                  <option value="">{t("noReadyEnvironments")}</option>
                )}
                {sources.data?.environments.map((environment) => (
                  <option key={environment.id} value={environment.id}>
                    {environment.name || t("projectCheckout")}
                  </option>
                ))}
              </select>
              <select
                className="os-planning-picker"
                aria-label={t("planningSource")}
                value={
                  selectedStoreId === undefined
                    ? "auto"
                    : selectedStoreId === null
                      ? "local"
                      : `store:${selectedStoreId}`
                }
                onChange={(event) => {
                  const value = event.target.value;
                  setStoreId(
                    value === "auto"
                      ? undefined
                      : value === "local"
                        ? null
                        : value.slice(6),
                  );
                  setChangeId("");
                  setArchived(false);
                  setCompactDetail(false);
                  setEditingSource(false);
                }}
              >
                <option value="auto">{t("sourceAuto")}</option>
                <option value="local">{t("sourceLocal")}</option>
                {selectedStoreId &&
                  !planningSources.data?.stores.some(
                    (store) => store.id === selectedStoreId,
                  ) && (
                    <option value={`store:${selectedStoreId}`}>
                      Store · {selectedStoreId}
                    </option>
                  )}
                {planningSources.data?.stores.map((store) => (
                  <option key={store.id} value={`store:${store.id}`}>
                    Store · {store.id}
                  </option>
                ))}
              </select>
              {planningSources.data?.warning && (
                <Message>{planningSources.data.warning}</Message>
              )}
              {planningSources.error && (
                <Message error>{planningSources.error}</Message>
              )}
            </div>
          )}
        </header>
        {sources.error && <Message error>{sources.error}</Message>}
        {refreshError && <Message error>{refreshError}</Message>}
        {changes.data?.watchError && (
          <Message error>
            {t("watchUnavailable")} {changes.data.watchError}
          </Message>
        )}
        {!source && sources.data && (
          <Message>{t("chooseReadyProject")}</Message>
        )}
        {source && (
          <div
            className={`os-layout${compact ? " os-compact" : ""}${compact && compactDetail ? " os-compact-detail" : ""}`}
          >
            <aside className="os-sidebar">
              <div className="os-nav">
                <button
                  aria-pressed={!effectiveArchived}
                  onClick={() => {
                    setArchived(false);
                    setChangeId("");
                  }}
                >
                  {t("active")} · {number(activeCount)}
                </button>
                <button
                  aria-pressed={effectiveArchived}
                  onClick={() => {
                    setArchived(true);
                    setChangeId("");
                  }}
                >
                  {t("archive")} · {number(archiveCount)}
                </button>
              </div>
              <Input
                aria-label={t("searchChanges")}
                placeholder={t("findChange")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="os-section-name">{t("changes")}</div>
              {compact && changes.error && (
                <Message error>{changes.error}</Message>
              )}
              {compact && !changes.data && !changes.error && (
                <Message>{t("loadingChanges")}</Message>
              )}
              <div className="os-changes">
                {matching.map((change) => (
                  <button
                    className={`os-change${change.total > 0 && change.done === change.total && !change.error ? " os-completed" : ""}`}
                    key={change.id}
                    aria-pressed={selected?.id === change.id}
                    onClick={() => {
                      setChangeId(change.id);
                      if (compact) setCompactDetail(true);
                    }}
                  >
                    <strong>{change.title}</strong>
                    <small>{change.id}</small>
                    <div className="os-change-foot">
                      <span
                        className="os-task-progress"
                        title={taskCount(change.total)}
                        role="progressbar"
                        aria-label={t("taskProgress")}
                        aria-valuemin={0}
                        aria-valuemax={change.total || 1}
                        aria-valuenow={change.done}
                      >
                        <i
                          style={{
                            width: `${change.total ? (change.done / change.total) * 100 : 0}%`,
                          }}
                        />
                      </span>
                      <span>
                        {change.error
                          ? t("error")
                          : change.total
                            ? `${number(change.done)} / ${number(change.total)}`
                            : t("noTasks")}
                      </span>
                    </div>
                    <div className="os-change-meta">
                      {change.total > 0 &&
                        change.done === change.total &&
                        !change.error && (
                          <span className="os-completion">
                            ✓ {t("completed")}
                          </span>
                        )}
                      <ThreadIndicator threads={change.threads} />
                    </div>
                  </button>
                ))}
              </div>
              {changes.data && !matching.length && (
                <Message>
                  {changes.data.missing ? t("notInitialized") : t("noChanges")}
                </Message>
              )}
            </aside>
            <div className="os-detail">
              {compact && compactDetail && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="os-back"
                  onClick={() => setCompactDetail(false)}
                >
                  {t("allChanges")}
                </Button>
              )}
              {changes.error && (
                <Message error>
                  {changes.error}
                  <Button variant="link" size="sm" onClick={refreshFiles}>
                    {t("retry")}
                  </Button>
                </Message>
              )}
              {!changes.data && !changes.error && (
                <Message>{t("loadingChanges")}</Message>
              )}
              {selected && changes.data && (!compact || compactDetail) && (
                <ChangeDetail
                  key={JSON.stringify([
                    source.id,
                    changes.data.source.storeId,
                    changes.data.source.rootPath,
                    selected.id,
                  ])}
                  rpc={rpc}
                  source={source}
                  planningSource={changes.data.source}
                  change={selected}
                  onRefresh={refreshFiles}
                />
              )}
              {changes.data && !selected && (
                <Message>
                  {changes.data.missing
                    ? t("noOpenSpecDirectory")
                    : t("emptySection")}
                </Message>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function NavigationPage({ subPath }: PluginNavPanelProps) {
  return (
    <I18nProvider>
      <OpenSpecPage subPath={subPath} />
    </I18nProvider>
  );
}
function ThreadPanel({ threadId }: { threadId: string }) {
  return (
    <I18nProvider>
      <OpenSpecPage threadId={threadId} />
    </I18nProvider>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "openspec",
    title: "OpenSpec",
    icon: "ListTodo",
    path: "openspec",
    component: NavigationPage,
  });
  app.slots.experimental_tab({
    context: { kind: "thread" },
    availability: "action",
    id: "change",
    title: "OpenSpec",
    icon: "ListTodo",
    component: ThreadPanel,
    layout: "flush",
  });
});
