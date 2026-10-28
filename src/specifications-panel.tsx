import { useState, useRef, useLayoutEffect, type ReactNode } from "react";
import { Markdown, useBbNavigate, experimental_useRpcQuery as useRpcQuery } from "@get-bb/plugin-sdk/app";
import { Icon } from "../components/ui/icon";
import { rpcContract } from "./contract";
import type { SpecificationEntry, SpecificationCatalog, SpecificationDocument } from "./specification-model";
import type { PlanningSource } from "./planning-source";
import { specificationIntroduction, specificationConclusion } from "./specification-projection";
import { useI18n } from "./i18n-react";
import { localizedError } from "./plugin-error";

type Node = { id: string; name: string; entry?: SpecificationEntry; children: Map<string, Node> };
function tree(entries: SpecificationEntry[]) {
  const root: Node = { id: "", name: "", children: new Map() };
  for (const entry of entries) {
    let node = root;
    for (const part of entry.id.split("/")) {
      const next = node.children.get(part) ?? { id: node.id ? `${node.id}/${part}` : part, name: part, children: new Map<string, Node>() };
      node.children.set(part, next); node = next;
    }
    node.entry = entry;
  }
  return root;
}
const label = (id: string) => { const text = id.split("/").at(-1)!.replaceAll("-", " "); return text.charAt(0).toUpperCase() + text.slice(1); };
const withoutTitle = (text: string) => text.replace(/^#[^\n]*\n/, "").trim();
type Mode = "current" | "proposed" | "compare";
export function SpecificationsPanel({ environmentId, hostId, source, catalog, error, routeCapability = "", navigateSelection = true, onRefresh }: {
  environmentId: string; hostId: string; source: PlanningSource; catalog?: SpecificationCatalog; error?: string; routeCapability?: string; navigateSelection?: boolean; onRefresh: () => void;
}) {
  const { t, locale } = useI18n();
  const navigate = useBbNavigate();
  const [selected, setSelected] = useState(routeCapability);
  const [change, setChange] = useState<string>();
  const [mode, setMode] = useState<Mode>();
  const [filter, setFilter] = useState("");
  const [reading, setReading] = useState(false);
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const entry = catalog?.entries.find(entry => entry.id === selected) ?? catalog?.entries[0];
  const selectedChange = entry?.changes.find(item => item.changeId === change) ?? entry?.changes[0];
  const activeMode: Mode = !entry?.mainPath && mode === "current" ? "proposed" : mode ?? (selectedChange ? "proposed" : "current");
  const document = useRpcQuery({ contract: rpcContract, method: "specification", input: {
    environmentId, storeId: source.storeId, capabilityId: entry?.id ?? "", ...(selectedChange ? { changeId: selectedChange.changeId } : {}),
  }, enabled: !!entry });
  const doc = document.data;
  const reader = useRef<HTMLElement>(null);
  useLayoutEffect(() => { if (reader.current) reader.current.scrollTop = 0; }, [entry?.id, selectedChange?.changeId, activeMode]);
  function select(item: SpecificationEntry) {
    setSelected(item.id); setChange(undefined); setMode(undefined); setReading(true);
    if (navigateSelection) navigate.toPluginPanel("specifications", { subPath: `${environmentId}/${item.id}`, replace: true });
  }
  function message(content: ReactNode, isError = false) { return <div className={`os-message${isError ? " os-error" : ""}`} role={isError ? "alert" : "status"}>{content}</div>; }
  function leaf(item: SpecificationEntry, own = false) {
    const status = !item.changes.length ? "current" : item.changes.some(change => change.status === "unknown" || change.error) ? "unresolved" : item.mainPath ? "modified" : item.changes.every(change => change.status === "added") ? "added" : "unresolved";
    const statusText = t(`spec.${status}`);
    return <button key={`${item.id}:file`} className={`sp-file sp-${status}${entry?.id === item.id ? " sp-selected" : ""}`} aria-label={`${item.id} — ${statusText}`} aria-current={entry?.id === item.id ? "page" : undefined} title={`${item.id} — ${statusText}`} onClick={() => select(item)}>
      <Icon name="FileText" className="sp-file-icon" /><span>{own ? "spec.md" : label(item.id)}</span>
      {status !== "current" && <small aria-hidden="true">{status === "added" ? "A" : status === "modified" ? "M" : "!"}</small>}
    </button>;
  }
  function branch(node: Node): ReactNode {
    if (!node.children.size) return node.entry ? leaf(node.entry) : null;
    return <details key={node.id} open={!!filter || !collapsed.has(node.id)} onToggle={event => {
      if (filter) return;
      const open = event.currentTarget.open;
      setCollapsed(previous => {
        if (previous.has(node.id) === !open) return previous;
        const next = new Set(previous); if (open) next.delete(node.id); else next.add(node.id); return next;
      });
    }}><summary><Icon name="Folder" className="sp-folder-icon" /> <span>{node.name}</span></summary><div className="sp-children">{node.entry && leaf(node.entry, true)}{[...node.children.values()].map(branch)}</div></details>;
  }
  const filtered = catalog?.entries.filter(entry => entry.id.toLowerCase().includes(filter.toLowerCase()) || label(entry.id).toLowerCase().includes(filter.toLowerCase())) ?? [];
  const root = tree(filtered);
  function unresolved(data: SpecificationDocument) {
    return <>
      {message(t("spec.unresolvedProjection"), true)}
      <ul className="sp-issues">{data.issues.map((issue, index) => <li key={index}>{t(`spec.issue.${issue.code}`, { target: issue.target })}</li>)}</ul>
      {data.main && <details className="sp-raw" open><summary>{t("spec.current")}</summary><Markdown content={withoutTitle(data.main.content)} /></details>}
      {data.delta && <details className="sp-raw" open><summary>{t("spec.deltaSource")}</summary><Markdown content={data.delta.content} /></details>}
    </>;
  }
  return <div className={`sp-layout${reading ? " sp-reading" : ""}`}>
    <aside className="sp-tree" aria-label={t("spec.tree")}>
      <input value={filter} onChange={event => setFilter(event.target.value)} placeholder={t("spec.find")} aria-label={t("spec.find")} />
      {error && message(<>{localizedError(error, locale)} <button onClick={onRefresh}>{t("retry")}</button></>, true)}
      {!catalog && !error && message(t("loading"))}
      {[...root.children.values()].map(branch)}
      {catalog && !filtered.length && message(catalog.missing ? t("noOpenSpecDirectory") : t("spec.empty"))}
    </aside>
    <main className="sp-document" ref={reader}>
      <button className="sp-back" onClick={() => setReading(false)}>← {t("spec.specifications")}</button>
      {entry && <>
        <div className="sp-document-heading"><div><div className="sp-path">{entry.id}</div><h1>{label(entry.id)}</h1></div>
          {entry.changes.length > 0 && <div className="sp-versions" aria-label={t("spec.version")}>
            {(["current", "proposed", "compare"] as const).map(value => <button key={value} aria-pressed={activeMode === value} title={value === "current" && !entry.mainPath ? t("spec.noCurrent") : undefined} disabled={value === "current" && !entry.mainPath} onClick={() => setMode(value)}>{t(`spec.${value}`)}</button>)}
          </div>}
        </div>
        <div className="sp-source-line">
          <span>{!entry.mainPath ? t("spec.added") : selectedChange && activeMode !== "current" ? t("spec.proposed") : t("spec.current")}</span>
          {selectedChange && (entry.changes.length > 1 ? <select aria-label={t("spec.changeSource")} value={selectedChange.changeId} onChange={event => setChange(event.target.value)}>{entry.changes.map(item => <option key={item.changeId} value={item.changeId}>{item.changeId}</option>)}</select> : <span className="sp-change-name">{selectedChange.changeId}</span>)}
        </div>
        {document.error && message(localizedError(document.error.message, locale), true)}
        {!doc && !document.error && message(t("loadingDocument"))}
        {doc?.readErrors.map(item => <div key={item.path} className="os-message os-error" role="alert"><span className="sp-path">{item.path}</span><br />{localizedError(item.message, locale)}</div>)}
        {doc && <section className="sp-markdown">
          {activeMode === "current" ? doc.main ? <Markdown content={withoutTitle(doc.main.content)} /> : message(t("spec.noCurrent"))
            : !doc.delta ? doc.main ? <Markdown content={withoutTitle(doc.main.content)} /> : message(t("spec.noCurrent"))
            : doc.issues.length ? unresolved(doc)
            : activeMode === "proposed" ? <Markdown content={withoutTitle(doc.proposed ?? "")} />
            : <>
              <Markdown content={withoutTitle(specificationIntroduction(doc.proposed ?? doc.main?.content ?? ""))} />
              {doc.blocks.map((block, index) => block.operation === "unchanged" ? <Markdown key={index} content={block.after ?? ""} /> : <section key={index} className="sp-comparison">
                <div className="sp-operation">{t(`spec.operation.${block.operation}`)}{block.previousName && <span> · {block.previousName} → {block.name}</span>}</div>
                {block.before && <div className="sp-before"><span className="sp-comparison-label">{t("spec.current")}</span><Markdown content={block.before} /></div>}
                {block.after && <div className="sp-after"><span className="sp-comparison-label">{t("spec.proposed")}</span><Markdown content={block.after} /></div>}
              </section>)}
              <Markdown content={specificationConclusion(doc.proposed ?? doc.main?.content ?? "")} />
            </>}
        </section>}
        {doc && <div className="sp-document-files">{[doc.main, doc.delta].filter(item => item !== null).map(item => <button key={item!.path} title={item!.path} onClick={() => navigate.experimental_openFilePreview({ target: { kind: "host", hostId, path: `${source.rootPath}/openspec/${item!.path}` }, location: null })}>{item!.path} ↗</button>)}</div>}
      </>}
      {catalog && !entry && message(t("spec.empty"))}
    </main>
  </div>;
}
