"use client";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Box,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  ExternalLink,
  FileJson,
  FlaskConical,
  GitBranch,
  Layers3,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Search,
  ShieldCheck,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { tasks, configurations } from "../benchmark/tasks";
import {
  csvExport,
  parseReport,
  passRate,
  type Report,
  type Row,
} from "../lib/report";
const labels = {
  baseline: "Baseline",
  official: "Official skill",
  enhanced: "Enhanced skill",
  reference: "Reference",
};
const icons = [Code2, BookOpen, Zap];
function download(name: string, body: string, type: string) {
  const u = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function Status({ row }: { row: Row | undefined }) {
  return (
    <span className={`status ${row?.status ?? "missing"}`}>
      {row?.status === "passed" ? (
        <Check size={12} />
      ) : row?.status === "failed" ? (
        <X size={12} />
      ) : (
        <span className="status-dot" />
      )}
      {row?.status === "blocked"
        ? "Blocked"
        : row?.status === "passed"
          ? "Passed"
          : row?.status === "failed"
            ? "Failed"
            : row?.status === "skipped"
              ? "Skipped"
              : "Not run"}
    </span>
  );
}
export default function Dashboard({ initial }: { initial: Report }) {
  const [report, setReport] = useState(initial);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const agentRows = report.rows.filter((r) => r.configuration !== "reference");
  const reference = report.rows.filter((r) => r.configuration === "reference");
  const evaluated = agentRows.filter(
    (r) => r.status === "passed" || r.status === "failed",
  );
  const passed = reference.filter((r) => r.status === "passed").length;
  const spent = agentRows.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0);
  const knownCosts = agentRows.some((r) => r.estimatedCostUsd !== null);
  const visible = tasks.filter(
    (t) =>
      (category === "All categories" || t.category === category) &&
      (t.name + " " + t.category + " " + t.id)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const failures = Object.entries(
    agentRows
      .filter((r) => r.status === "failed" || r.status === "blocked")
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + 1;
        return acc;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const selectedTask = tasks.find((t) => t.id === selected);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "Tab") {
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".task-modal button,.task-modal a",
          ),
        );
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [selected]);
  async function importFile(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error("Reports must be under 2 MB");
      const parsed = parseReport(await file.text());
      setReport(parsed);
      setImported(true);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid report");
    }
  }
  function exportReport(format: "json" | "csv") {
    download(
      `agentfirst-${report.id}.${format}`,
      format === "json" ? JSON.stringify(report, null, 2) : csvExport(report),
      format === "json" ? "application/json" : "text/csv",
    );
    setExportOpen(false);
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <a href="#" className="brand" aria-label="AgentFirst home">
          <span className="brand-icon">
            <AudioLines size={23} />
          </span>
          agentfirst<span className="brand-period">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">a</span>
          <div>
            AssemblyAI <small>Agent Experience</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          <a
            className="integration-nav"
            href="/integration"
            aria-label="Open the real AssemblyAI transcription demo"
          >
            <AudioLines size={18} />
            <span>AssemblyAI demo</span>
            <ArrowUpRight size={13} />
          </a>
          {[
            { name: "Evaluations", icon: FlaskConical, view: "Overview" },
            { name: "Task suite", icon: ListChecks, view: "Task suite" },
            { name: "Methodology", icon: Layers3, view: "Methodology" },
          ].map((item) => (
            <button
              key={item.name}
              className={tab === item.view ? "active" : ""}
              onClick={() => setTab(item.view)}
            >
              <item.icon size={18} />
              {item.name}
              {item.name === "Task suite" && (
                <span className="nav-count">14</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <ShieldCheck size={18} />
          </div>
          <strong>Evidence comes first.</strong>
          <p>
            Every result has a source.
            <br />
            Every improvement needs a run.
          </p>
          <button onClick={() => setTab("Methodology")}>
            How we evaluate <ArrowUpRight size={13} />
          </button>
        </div>
        <a
          className="sidebar-bottom"
          href="https://github.com/AssemblyAI/assemblyai-skill"
          target="_blank"
          rel="noreferrer"
        >
          <GitBranch size={17} /> Official AssemblyAI skill{" "}
          <ArrowUpRight size={13} />
        </a>
        <div className="version">
          <span className="online-dot" /> AgentFirst v0.1{" "}
          <span>Open source</span>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <ChevronRight size={13} />
            <strong>Evaluations</strong>
          </div>
          <div className="top-links">
            <a href="/integration">
              <AudioLines size={15} /> API demo <ArrowUpRight size={13} />
            </a>
            <span className="local-indicator">
              <span className="online-dot" /> Static dashboard
            </span>
            <a
              href="https://www.assemblyai.com/docs/coding-agent-prompts"
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen size={15} /> Documentation <ArrowUpRight size={13} />
            </a>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <FlaskConical size={14} /> AGENT EXPERIENCE LAB
              </div>
              <h1>Better integrations start with evidence.</h1>
              <p>Measure how reliably coding agents build with AssemblyAI.</p>
            </div>
            <div className="heading-actions">
              <input
                ref={upload}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importFile(f);
                  e.target.value = "";
                }}
              />
              <button
                className="button"
                onClick={() => upload.current?.click()}
              >
                <Upload size={15} /> Import run
              </button>
              <div className="export-wrap">
                <button
                  className="button primary"
                  onClick={() => setExportOpen(!exportOpen)}
                  aria-expanded={exportOpen}
                >
                  <ArrowDownToLine size={15} /> Export results{" "}
                  <ChevronDown size={13} />
                </button>
                {exportOpen && (
                  <div className="export-menu">
                    <button onClick={() => exportReport("json")}>
                      <FileJson size={15} /> Export JSON
                    </button>
                    <button onClick={() => exportReport("csv")}>
                      <ListChecks size={15} /> Export CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {error && (
            <div role="alert" className="error-banner">
              Import failed: {error.slice(0, 250)}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          <div className={`run-strip ${report.kind === "demo" ? "demo" : ""}`}>
            <div className="run-strip-left">
              <span className="run-symbol">
                <Activity size={17} />
              </span>
              <strong>
                {report.kind === "demo"
                  ? "DEMO DATA"
                  : report.kind === "readiness"
                    ? "Harness readiness"
                    : "Benchmark run"}
              </strong>
              <span className="strip-divider" />
              <span>{report.title}</span>
              <span className="subtle-pill">
                {imported ? "Imported locally" : "Published report"}
              </span>
            </div>
            <span className="run-date">
              {report.createdAt.slice(0, 10)}{" "}
              <span className="mono">{report.id.slice(-9)}</span>
            </span>
          </div>
          <div className="tabs" role="tablist" aria-label="Evaluation views">
            {["Overview", "Task suite", "Methodology"].map((name) => (
              <button
                role="tab"
                aria-selected={tab === name}
                key={name}
                className={tab === name ? "selected" : ""}
                onClick={() => setTab(name)}
              >
                {name}
                {name === "Task suite" && <span>14</span>}
              </button>
            ))}
            <div className="tab-aside">
              <LockKeyhole size={12} /> Runner isolated from frontend
            </div>
          </div>
          {tab === "Methodology" ? (
            <section className="methodology panel">
              <div className="section-kicker">DESIGNED TO BE REPRODUCIBLE</div>
              <h2>One task suite. Three instruction sets.</h2>
              <p>
                Baseline receives the task and TypeScript contract. Official
                adds the pinned AssemblyAI skill. Enhanced adds the official
                skill plus explicit verification guidance. The model, output
                budget, timeout, and evaluation checks stay fixed.
              </p>
              <div className="method-grid">
                {[
                  {
                    icon: Box,
                    title: "Isolated evaluation",
                    text: "Candidate code compiles and runs in disposable non-root Docker containers, with no network, a read-only filesystem, 256 MB memory, 0.5 CPU and a 30-second deadline.",
                  },
                  {
                    icon: FileJson,
                    title: "Traceable inputs",
                    text: `Source commit ${report.environment.officialSkillCommit.slice(0, 12)}, task suite and lockfile hashes, prompt and artifact hashes, exact model/version, tokens, latency and estimated cost travel with each run.`,
                  },
                  {
                    icon: ShieldCheck,
                    title: "Honest measurement",
                    text: "Reference calibration validates the harness only. Blocked cells are excluded from pass rates. Single-turn API generation is labelled separately from imported full coding-agent sessions.",
                  },
                ].map((x) => (
                  <article key={x.title}>
                    <x.icon size={23} />
                    <h3>{x.title}</h3>
                    <p>{x.text}</p>
                  </article>
                ))}
              </div>
              <h3>What this run can tell you</h3>
              <ul>
                {report.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <h3>Reproduce locally</h3>
              <pre>
                npm ci{`\n`}npm run bench:prepare{`\n`}docker build -t
                agentfirst-runner:local -f benchmark/Dockerfile .{`\n`}npm run
                bench:pin-image{`\n`}npm run bench:run -- --inputs
                benchmark/runs/generated
              </pre>
              <p className="fine-print">
                The public site has no execution endpoint, credentials,
                database, or paid API access. Imports stay in your browser
                session. Only explicitly published reports become part of the
                dashboard.
              </p>
            </section>
          ) : (
            <>
              {tab === "Overview" && (
                <>
                  <section className="metrics">
                    {[
                      {
                        label: "Integration tasks",
                        value: String(tasks.length),
                        detail: "6 integration surfaces",
                        icon: ListChecks,
                        color: "purple",
                      },
                      {
                        label: "Reference checks",
                        value: `${passed}/${reference.length || "—"}`,
                        detail: reference.length
                          ? "Trusted fixture calibration"
                          : "No calibration in this run",
                        icon: CheckCheck,
                        color: "green",
                      },
                      {
                        label: "Agent evaluations",
                        value: `${evaluated.length}`,
                        suffix: `/ ${tasks.length * 3}`,
                        detail: evaluated.length
                          ? "Measured candidate outputs"
                          : "Awaiting isolated execution",
                        icon: FlaskConical,
                        color: "blue",
                      },
                      {
                        label: "Estimated model cost",
                        value: knownCosts ? `$${spent.toFixed(3)}` : "—",
                        detail: knownCosts
                          ? "Based on reported token usage"
                          : "No paid model usage recorded",
                        icon: Clock3,
                        color: "orange",
                      },
                    ].map((m) => (
                      <article className="metric panel" key={m.label}>
                        <div className="metric-top">
                          {m.label}
                          <span className={`metric-icon ${m.color}`}>
                            <m.icon size={17} />
                          </span>
                        </div>
                        <div className="metric-value">
                          {m.value}
                          <span>{m.suffix}</span>
                        </div>
                        <div className="metric-detail">{m.detail}</div>
                      </article>
                    ))}
                  </section>
                  <div className="analysis-grid">
                    <section className="panel comparison">
                      <div className="panel-heading">
                        <div>
                          <h2>Instruction set comparison</h2>
                          <p>Same tasks. Same budgets. Different context.</p>
                        </div>
                        <span className="subtle-pill">
                          {tasks.length} tasks × 3 configurations
                        </span>
                      </div>
                      <div className="comparison-labels">
                        <span>CONFIGURATION</span>
                        <span>PASS RATE</span>
                        <span>EVALUATED</span>
                      </div>
                      {configurations.map((config, index) => {
                        const rows = agentRows.filter(
                          (r) => r.configuration === config,
                        );
                        const rate = passRate(rows);
                        const done = rows.filter(
                          (r) => r.status === "passed" || r.status === "failed",
                        ).length;
                        const Icon = icons[index];
                        return (
                          <div className="comparison-row" key={config}>
                            <div className="config-name">
                              <span className={`config-icon config-${index}`}>
                                <Icon size={17} />
                              </span>
                              <div>
                                <strong>{labels[config]}</strong>
                                <small>
                                  {
                                    [
                                      "Task instructions only",
                                      "Pinned AssemblyAI guidance",
                                      "Official + verification layer",
                                    ][index]
                                  }
                                </small>
                              </div>
                            </div>
                            <div className="rate-cell">
                              <div className="rate-track">
                                <div
                                  style={{ width: `${(rate ?? 0) * 100}%` }}
                                />
                              </div>
                              <span>
                                {rate === null
                                  ? "—"
                                  : `${Math.round(rate * 100)}%`}
                              </span>
                            </div>
                            <span className="evaluated-count">
                              {done}
                              <span> / {tasks.length}</span>
                            </span>
                          </div>
                        );
                      })}
                      <div className="comparison-foot">
                        <span className="small-dot" />
                        {evaluated.length
                          ? "Pass rate excludes blocked and skipped evaluations."
                          : "No agent comparison yet. Calibration results do not imply skill improvement."}
                      </div>
                    </section>
                    <section className="panel readiness">
                      <div className="panel-heading">
                        <h2>Execution readiness</h2>
                        <span className="status passed">
                          <span className="status-dot" /> Harness checked
                        </span>
                      </div>
                      <div className="readiness-number">
                        <div
                          className="ring"
                          style={
                            {
                              "--progress": `${reference.length ? (passed / reference.length) * 100 : 0}%`,
                            } as React.CSSProperties
                          }
                        >
                          <Check size={25} />
                        </div>
                        <div>
                          <strong>
                            {passed}
                            <span> / {reference.length || "—"}</span>
                          </strong>
                          <small>reference contracts passed</small>
                        </div>
                      </div>
                      <div className="readiness-line">
                        <span>Deterministic contract tests</span>
                        <span className="green-text">
                          {reference.length && passed === reference.length
                            ? "Verified"
                            : "See report"}
                        </span>
                      </div>
                      <div className="readiness-line">
                        <span>Agent sandbox</span>
                        <span className="amber-text">
                          {report.environment.imageDigest
                            ? "Pinned image"
                            : "Unavailable"}
                        </span>
                      </div>
                      <div className="readiness-line">
                        <span>Live API smoke tests</span>
                        <span className="muted">Not in this report</span>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setTab("Methodology")}
                      >
                        View verification details <ArrowUpRight size={14} />
                      </button>
                    </section>
                  </div>
                </>
              )}
              <section className="panel task-panel">
                <div className="panel-heading task-heading">
                  <div>
                    <h2>
                      Integration task matrix{" "}
                      <span className="count-pill">{tasks.length}</span>
                    </h2>
                    <p>Inspect the evidence behind each integration.</p>
                  </div>
                  <div className="table-tools">
                    <label className="search">
                      <Search size={15} />
                      <input
                        aria-label="Search tasks"
                        placeholder="Search tasks…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <kbd>/</kbd>
                    </label>
                    <select
                      aria-label="Filter category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {[
                        "All categories",
                        ...new Set(tasks.map((t) => t.category)),
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="task-number">#</th>
                        <th>INTEGRATION TASK</th>
                        <th>CATEGORY</th>
                        <th>BASELINE</th>
                        <th>OFFICIAL SKILL</th>
                        <th>ENHANCED SKILL</th>
                        <th>REFERENCE</th>
                        <th aria-label="Details" />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((task) => (
                        <tr key={task.id} onClick={() => setSelected(task.id)}>
                          <td className="task-number mono">
                            {String(tasks.indexOf(task) + 1).padStart(2, "0")}
                          </td>
                          <td>
                            <button
                              className="task-link"
                              onClick={() => setSelected(task.id)}
                            >
                              {task.name}
                            </button>
                            <small className="task-id mono">{task.id}</small>
                          </td>
                          <td>
                            <span className="category-tag">
                              {task.category}
                            </span>
                          </td>
                          {[...configurations, "reference" as const].map(
                            (c) => (
                              <td key={c}>
                                <Status
                                  row={report.rows.find(
                                    (r) =>
                                      r.taskId === task.id &&
                                      r.configuration === c,
                                  )}
                                />
                              </td>
                            ),
                          )}
                          <td>
                            <ChevronRight size={15} className="muted" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="empty">
                      No tasks match this search. Try another category or
                      phrase.
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    Showing {visible.length} of {tasks.length} tasks
                  </span>
                  <span>
                    <span className="small-dot" /> Click a task to inspect its
                    contract and traces
                  </span>
                </div>
              </section>
              {tab === "Overview" && (
                <div className="bottom-grid">
                  <section className="panel failures">
                    <div className="panel-heading">
                      <div>
                        <h2>Failure & blocker categories</h2>
                        <p>
                          Infrastructure blockers stay separate from code
                          failures.
                        </p>
                      </div>
                      <Activity size={18} className="muted" />
                    </div>
                    {failures.length ? (
                      failures.map(([name, count]) => (
                        <div className="failure-row" key={name}>
                          <div>
                            <span>{name.replaceAll("-", " ")}</span>
                            <strong>{count}</strong>
                          </div>
                          <div className="failure-track">
                            <div
                              style={{
                                width: `${(count / agentRows.length) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty">
                        No failure or blocker categories in this report.
                      </p>
                    )}
                  </section>
                  <section className="panel provenance">
                    <div className="panel-heading">
                      <h2>Run provenance</h2>
                      <FileJson size={17} className="muted" />
                    </div>
                    <dl>
                      <dt>Official skill</dt>
                      <dd className="mono">
                        {report.environment.officialSkillCommit.slice(0, 12)}{" "}
                        <a
                          aria-label="View official skill commit"
                          href={`https://github.com/AssemblyAI/assemblyai-skill/tree/${report.environment.officialSkillCommit}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </dd>
                      <dt>Runtime</dt>
                      <dd className="mono">Node {report.environment.node}</dd>
                      <dt>Suite fingerprint</dt>
                      <dd className="mono">
                        {report.environment.taskSuiteSha256.slice(0, 16)}
                      </dd>
                      <dt>Container image</dt>
                      <dd>
                        {report.environment.imageDigest ? (
                          <span className="mono">
                            {report.environment.imageDigest.slice(0, 19)}
                          </span>
                        ) : (
                          <span className="amber-text">
                            Not pinned / not available
                          </span>
                        )}
                      </dd>
                    </dl>
                  </section>
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <AudioLines size={14} /> AgentFirst <span>·</span> Built for
              AssemblyAI Agent Experience
            </span>
            <span>Evidence over assumptions.</span>
          </footer>
        </div>
      </main>
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <section
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedTask.name}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">TASK CONTRACT</span>
                <h2>{selectedTask.name}</h2>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="Close task details"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p>{selectedTask.prompt}</p>
            <a
              className="docs-link"
              href={selectedTask.docs}
              target="_blank"
              rel="noreferrer"
            >
              Official source <ArrowUpRight size={13} />
            </a>
            {[...configurations, "reference" as const].map((c) => {
              const row = report.rows.find(
                (r) => r.taskId === selected && r.configuration === c,
              );
              return (
                <article className="trace-block" key={c}>
                  <div>
                    <strong>{labels[c]}</strong>
                    <Status row={row} />
                  </div>
                  <pre>{row?.trace ?? "No result supplied."}</pre>
                  {row?.artifactSha256 && (
                    <small className="mono">
                      artifact {row.artifactSha256.slice(0, 20)} ·{" "}
                      {row.latencyMs?.toFixed(1)} ms
                    </small>
                  )}
                </article>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
