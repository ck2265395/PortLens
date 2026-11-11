# PortLens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and package a production-ready Windows desktop application that discovers local TCP listeners and UDP bindings, searches and inspects their owning processes/services, and safely stops eligible targets with confirmation, verification, privilege handling, and audit logs.

**Architecture:** Electron main owns all Windows access behind a `SystemPortProvider`; the first provider invokes PowerShell/CIM and normalizes results into shared domain types. A context-isolated preload exposes a narrow typed IPC API to a React renderer, which maintains stable incremental list state and the balanced-workbench UI.

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest, React Testing Library, Playwright Electron, Zod, electron-builder, PowerShell/CIM.

**Spec:** `docs/superpowers/specs/2026-11-11-portlens-design.md`

## Global Constraints

- Support Windows 10 22H2, Windows 11, and Windows Server 2019/2022/2025 on x64 only.
- Run without administrator rights by default and request elevation only for a restricted operation.
- Keep `contextIsolation: true`, `nodeIntegration: false`, and expose only whitelisted typed preload methods.
- Show TCP listeners and UDP bindings; exclude ordinary active connections.
- Refresh by structured diff every 3 seconds by default, with 1/3/5/10-second and paused settings.
- Every stop action requires confirmation; never provide a “do not ask again” option.
- Never terminate protected targets defined by the spec, even after elevation.
- Retain local operation logs for 7 days and support JSON/CSV export.
- Closing the window exits, except while a stop operation is unresolved.

## Review Focus

- A port reused by a new PID must render as a removed record plus a new record, never an in-place continuation; pin in Task 3 diff tests.
- Malformed, localized, empty, or timed-out PowerShell output must preserve the last good snapshot and return a typed error; pin in Task 2 provider tests and Task 6 store tests.
- A PID that exits or changes identity between confirmation and execution must be rejected; pin in Task 4 action-service tests.
- Shared service hosts and protected processes must be blocked below the renderer/IPC boundary; pin in Task 4 and Task 5 tests.
- Closing during a hung stop operation must remain recoverable after timeout and log an unknown result; pin in Task 8 integration tests.

---

### Task 1: Electron/React foundation and shared contracts

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `electron-builder.yml`
- Create: `src/shared/ports.ts`, `src/shared/ipc.ts`, `src/shared/settings.ts`
- Create: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.tsx`, `src/renderer/App.tsx`
- Test: `src/shared/ports.test.ts`, `src/main/window.test.ts`

**Interfaces:**
- Produces: `PortRecord`, `PortSnapshot`, `ProcessIdentity`, `ServiceInfo`, `AppSettings`, `StopRequest`, `StopProgress`, `StopResult`, `PortLensApi`, and IPC channel constants.
- Produces: `createMainWindow(): BrowserWindow` configured with context isolation and the preload entry.

- [ ] **Step 1: Write failing contract and BrowserWindow security tests** asserting schema parsing rejects invalid protocol/status combinations and the window enables context isolation while disabling Node integration.
- [ ] **Step 2: Run `npm test -- --run src/shared/ports.test.ts src/main/window.test.ts` and verify failures are caused by missing contracts/window factory.**
- [ ] **Step 3: Create the Electron/Vite/React project, exact shared types, strict TypeScript configuration, and secure `createMainWindow()`.**
- [ ] **Step 4: Run `npm test -- --run src/shared/ports.test.ts src/main/window.test.ts` and `npm run typecheck`; expect all pass.**
- [ ] **Step 5: Commit with message `build: scaffold secure electron react app`.**

### Task 2: Windows PowerShell port provider

**Files:**
- Create: `src/main/system/SystemPortProvider.ts`
- Create: `src/main/system/PowerShellPortProvider.ts`
- Create: `src/main/system/powershellRunner.ts`
- Create: `src/main/system/scripts/get-port-snapshot.ps1`
- Test: `src/main/system/PowerShellPortProvider.test.ts`, `src/main/system/fixtures/*.json`

**Interfaces:**
- Consumes: `PortSnapshot` and domain schemas from Task 1.
- Produces: `SystemPortProvider.getSnapshot(signal?: AbortSignal): Promise<PortSnapshot>`.
- Produces: `runPowerShell(scriptPath: string, args: readonly string[], options: { timeoutMs: number; signal?: AbortSignal }): Promise<{ stdout: string; stderr: string }>`.

- [ ] **Step 1: Write failing provider tests** for TCP/UDP normalization, service/user/process enrichment, empty output, invalid JSON, localized text independence, non-zero exit, abort, and timeout.
- [ ] **Step 2: Run `npm test -- --run src/main/system/PowerShellPortProvider.test.ts`; expect missing provider failures.**
- [ ] **Step 3: Implement one structured JSON PowerShell script using Windows cmdlets/CIM, the timeout-aware runner, Zod validation, and typed provider errors.**
- [ ] **Step 4: Run the provider tests and `npm run typecheck`; expect all pass.**
- [ ] **Step 5: On Windows, run `npm run diagnostic:ports` and verify returned records contain stable identities without ordinary active TCP connections.**
- [ ] **Step 6: Commit with message `feat: discover local listening ports`.**

### Task 3: Snapshot diff and search engine

**Files:**
- Create: `src/shared/portKey.ts`, `src/shared/diffSnapshots.ts`, `src/shared/searchPorts.ts`
- Test: `src/shared/diffSnapshots.test.ts`, `src/shared/searchPorts.test.ts`

**Interfaces:**
- Consumes: `PortRecord`, `PortSnapshot`.
- Produces: `portKey(record): string`, `diffSnapshots(previous, next): SnapshotDiff`, `searchPorts(records, query, filters): PortRecord[]`.

- [ ] **Step 1: Write failing tests** for identity key composition, PID reuse, removal/addition/change sets, case-insensitive substring search, numeric port/PID matching, multi-keyword AND semantics, protocol/address filtering, and stable port ordering.
- [ ] **Step 2: Run the two test files and confirm missing-function failures.**
- [ ] **Step 3: Implement the pure key, diff, search, filter, and stable-sort functions.**
- [ ] **Step 4: Run tests and typecheck; expect all pass.**
- [ ] **Step 5: Commit with message `feat: add stable port diff and search`.**

### Task 4: Protected-target policy and stop orchestration

**Files:**
- Create: `src/main/actions/targetPolicy.ts`, `src/main/actions/processIdentity.ts`, `src/main/actions/StopService.ts`
- Create: `src/main/system/scripts/stop-target.ps1`
- Test: `src/main/actions/targetPolicy.test.ts`, `src/main/actions/StopService.test.ts`

**Interfaces:**
- Consumes: `StopRequest`, `StopProgress`, `StopResult`, `ProcessIdentity`, `ServiceInfo`.
- Produces: `evaluateTarget(identity, services, selfTree): TargetPolicyDecision`.
- Produces: `StopService.prepare(request): Promise<StopPlan>` and `StopService.execute(plan, onProgress, signal): Promise<StopResult>`.

- [ ] **Step 1: Write failing policy tests** for PID 0/4, PortLens/self children, protected/critical processes, named core processes plus verified system paths, shared service hosts, stale identities, and ordinary elevated targets.
- [ ] **Step 2: Write failing orchestration tests** for service stop, GUI graceful close, unsupported console graceful close, delayed verification, force escalation only after a second confirmation token, process exit races, PID reuse, cancellation, timeout, and unknown result.
- [ ] **Step 3: Run the action tests and confirm failures.**
- [ ] **Step 4: Implement identity revalidation, policy evaluation, graceful methods, verification polling, and force-stop gating; keep final enforcement in main process.**
- [ ] **Step 5: Run action tests and typecheck; expect all pass.**
- [ ] **Step 6: Commit with message `feat: add guarded process stop workflow`.**

### Task 5: Typed preload API, IPC handlers, settings, and elevation bridge

**Files:**
- Create: `src/main/ipc/registerIpc.ts`, `src/main/ipc/validateSender.ts`, `src/main/settings/SettingsStore.ts`, `src/main/elevation/ElevationService.ts`
- Modify: `src/preload/index.ts`, `src/main/index.ts`
- Test: `src/main/ipc/registerIpc.test.ts`, `src/main/settings/SettingsStore.test.ts`, `src/main/elevation/ElevationService.test.ts`

**Interfaces:**
- Consumes: provider and stop-service interfaces from Tasks 2 and 4.
- Produces renderer API methods: `getSnapshot`, `getSettings`, `saveSettings`, `prepareStop`, `executeStop`, `confirmForceStop`, `cancelStop`, `subscribeStopProgress`, `getLogs`, `clearLogs`, `exportLogs`, `requestElevation`.

- [ ] **Step 1: Write failing tests** for sender validation, payload schema validation, protected-target rejection through IPC, settings defaults/persistence, elevation cancellation, and no arbitrary command exposure.
- [ ] **Step 2: Run the IPC/settings/elevation tests and confirm failures.**
- [ ] **Step 3: Implement the whitelist preload bridge, validated IPC handlers, atomic settings store, and a narrowly scoped elevation handshake that revalidates the prepared action.**
- [ ] **Step 4: Run tests, typecheck, and a search asserting renderer sources contain no `child_process`, `ipcRenderer`, or Node filesystem imports.**
- [ ] **Step 5: Commit with message `feat: expose validated desktop api`.**

### Task 6: Renderer state, incremental refresh, and balanced-workbench UI

**Files:**
- Create: `src/renderer/app/PortStore.ts`, `src/renderer/app/usePortStore.ts`
- Create: `src/renderer/components/AppShell.tsx`, `Toolbar.tsx`, `PortTable.tsx`, `PortDetails.tsx`, `StatusBar.tsx`, `EmptyState.tsx`, `ErrorBanner.tsx`
- Create: `src/renderer/styles/app.css`
- Modify: `src/renderer/App.tsx`
- Test: `src/renderer/app/PortStore.test.ts`, `src/renderer/App.test.tsx`

**Interfaces:**
- Consumes: `window.portLens` and Task 3 diff/search functions.
- Produces: renderer store actions `refresh`, `setQuery`, `setFilters`, `setSort`, `setSelectedKey`, `setRefreshInterval`, `pause`, `resume`.

- [ ] **Step 1: Write failing store tests** for 3-second default, alternate intervals/pause, last-good snapshot retention, diff application, stable selection, vanished selected details, query/filter persistence, minimized low-frequency mode, and refresh suspension during confirmation/menu interaction.
- [ ] **Step 2: Write failing component tests** covering unified search, default columns, TCP/UDP labels, selection/details, related ports, risk states, manual refresh, no-results/reset, loading/error states, keyboard access, and no dangerous color-only indicators.
- [ ] **Step 3: Run renderer tests and confirm failures.**
- [ ] **Step 4: Implement the store and balanced-workbench React UI matching the approved first mockup, using responsive CSS for the table/detail split.**
- [ ] **Step 5: Run renderer tests, typecheck, and production renderer build; expect all pass.**
- [ ] **Step 6: Commit with message `feat: build balanced port workbench`.**

### Task 7: Confirmation flow, operation progress, and audit log

**Files:**
- Create: `src/renderer/components/StopConfirmation.tsx`, `ForceStopConfirmation.tsx`, `OperationProgress.tsx`, `OperationResult.tsx`, `OperationLog.tsx`
- Create: `src/main/logging/AuditLog.ts`, `src/shared/audit.ts`
- Modify: `src/main/ipc/registerIpc.ts`, `src/renderer/App.tsx`
- Test: `src/main/logging/AuditLog.test.ts`, `src/renderer/components/StopConfirmation.test.tsx`, `src/renderer/stop-flow.test.tsx`

**Interfaces:**
- Consumes: stop workflow and IPC API.
- Produces: `AuditLog.append`, `list`, `clear`, `prune`, `exportJson`, `exportCsv` and renderer stop-state transitions.

- [ ] **Step 1: Write failing audit tests** for required fields, atomic append, 7-day pruning, clear, valid CSV escaping, JSON export, and sensitive export warning metadata.
- [ ] **Step 2: Write failing UI flow tests** for mandatory confirmation, no default focus on danger, impact/related-port display, graceful progress, unsupported graceful path, distinct force confirmation, elevation cancellation, success/failure/unknown results, and immediate post-action refresh.
- [ ] **Step 3: Run the audit and stop-flow tests and confirm failures.**
- [ ] **Step 4: Implement the local audit store and complete renderer confirmation/progress/result/log experience.**
- [ ] **Step 5: Run tests, typecheck, and build; expect all pass.**
- [ ] **Step 6: Commit with message `feat: add confirmed stop and audit flows`.**

### Task 8: Window lifecycle, tray option, startup option, and end-to-end tests

**Files:**
- Create: `src/main/lifecycle/AppLifecycle.ts`, `src/main/lifecycle/TrayService.ts`, `src/main/lifecycle/StartupService.ts`
- Modify: `src/main/index.ts`, `src/renderer/components/AppShell.tsx`
- Create: `e2e/portlens.spec.ts`, `e2e/fixtures/fake-preload.ts`, `playwright.config.ts`
- Test: `src/main/lifecycle/AppLifecycle.test.ts`

**Interfaces:**
- Consumes: `AppSettings`, stop-operation state, and main window.
- Produces: lifecycle behavior where close exits, optional minimize-to-tray defaults off, startup defaults off, and unresolved stop blocks close until completion/timeout.

- [ ] **Step 1: Write failing lifecycle tests** for normal close, optional minimize-to-tray, startup toggle, unresolved-operation close dialog, wait/cancel-exit choices, timeout-to-unknown logging, and eventual exit.
- [ ] **Step 2: Write failing Playwright Electron tests** for discovery/search/filter/details, stable refresh, mandatory stop confirmation, force escalation, protected-target rejection, settings, logs, and narrow-window responsive layout using deterministic fake system data.
- [ ] **Step 3: Run lifecycle and E2E tests and confirm failures.**
- [ ] **Step 4: Implement lifecycle/tray/startup services and connect stop state to close handling.**
- [ ] **Step 5: Run unit, component, E2E, typecheck, and build commands; expect all pass.**
- [ ] **Step 6: Commit with message `feat: complete desktop lifecycle and e2e coverage`.**

### Task 9: Windows integration validation and distributable packaging

**Files:**
- Create: `scripts/windows-smoke.ps1`, `docs/operations.md`, `docs/privacy.md`
- Modify: `package.json`, `electron-builder.yml`, `README.md`
- Test: packaged application smoke run on the current Windows x64 machine.

**Interfaces:**
- Consumes: the completed application.
- Produces: unpacked app and installer artifacts plus an operator guide documenting permissions, protected targets, logs, export privacy, and supported Windows versions.

- [ ] **Step 1: Add packaging/smoke scripts and document exact acceptance checks** for TCP/UDP discovery, search, details, refresh, an ordinary safe test process, graceful-unsupported then forced stop, protected target rejection, log export, close, and restart.
- [ ] **Step 2: Run `npm ci`, `npm test -- --run`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`; expect zero failures.**
- [ ] **Step 3: Run `npm run package:win` and verify an x64 unpacked app and installer are produced.**
- [ ] **Step 4: Run the Windows smoke script against the packaged app, inspect the balanced-workbench UI at normal and narrow sizes, and record results in `docs/operations.md`.**
- [ ] **Step 5: Run `npm audit --omit=dev`, inspect Electron security warnings, and resolve any production high/critical findings.**
- [ ] **Step 6: Commit with message `release: package PortLens for Windows x64`.**

### Task 10: Final requirements audit and release readiness

**Files:**
- Modify: `README.md`, `docs/operations.md`
- Create: `docs/release-checklist.md`

**Interfaces:**
- Consumes: spec, all test/build/smoke evidence, and packaged artifacts.
- Produces: a requirement-by-requirement release checklist with evidence paths and commands.

- [ ] **Step 1: Map every design section to an implementation file and authoritative test or smoke result; mark missing evidence as incomplete.**
- [ ] **Step 2: Run the complete verification suite from a clean install and save exact versions and results in the checklist.**
- [ ] **Step 3: Review installer launch/uninstall behavior, settings/log locations, error recovery, and unsupported-platform messaging.**
- [ ] **Step 4: Fix any gaps found and rerun the affected broad verification suite.**
- [ ] **Step 5: Commit with message `docs: complete PortLens release audit`.**

