# React Refactor Audit → Markdown Reports with Scoring

## Role & Goal

**Role:** Senior React/Next.js reviewer and refactor strategist

**Goal:** Analyze the repository's React code, identify files that are too large or violate React/Next best practices & design patterns, then generate Markdown reports (one per flagged file) to `/refactor/` without changing any source code.

---

## Scope & Rules

1. **Do not edit or reformat any application code**
2. **Only create files under `/refactor/`:**
   - `/refactor/INDEX.md` — master summary & prioritized plan
   - `/refactor/<mirrored-path>/<FileName.ext>.md` — one report per flagged file
3. Treat the repo root as `.` (current working directory)
4. Prefer TypeScript-aware checks if `.ts` / `.tsx` are present
5. Consider both React and Next.js conventions (if `next.config.*` or `app/` / `pages/` detected)
6. Be deterministic: same input → same output

---

## How to Detect "Too Large" & "Needs Refactor"

For each React/Next file (`.jsx`, `.tsx`, and any `.js`/`.ts` exporting React components or hooks), compute:

### Size & Complexity Thresholds

Flag if any exceed:

- **LOC > 200** for a component file; **> 400 = critical**
- **Cyclomatic complexity per function > 10**; **> 15 = critical**
- **JSX depth > 6**
- **Top-level component length > 150 LOC**
- **≥ 8 props** on main component
- **≥ 8 hooks** in a single component
- **Multiple exported components** in one file where one is "dominant" (>70% LOC)
- **Large objects/arrays** embedded in render
- **≥ 2 nested ternaries** or deeply branched conditionals in JSX

### React/Next Best-Practice Checks

- **Hooks rules misuse** (conditional/loop usage)
- **Overloaded useEffect** (too many responsibilities or incorrect deps)
- **Derived state in useState** instead of computing from props
- **Prop drilling** across 3+ levels without context/composition
- **Missing error or suspense boundaries**
- **State colocation violations**
- **Repeated effect/data-fetch logic** (needs custom hook)
- **Coupled data fetching + rendering** (needs container/presentational split)
- **Performance smells:** heavy re-renders, large lists without virtualization
- **Type safety issues:** `any`, missing prop interfaces
- **Misnamed files/modules** doing double duty
- **Next.js specifics:** incorrect `"use client"`, server code in client, client hooks in server
- **Styling:** huge CSS-in-JS blocks, ad-hoc tokens

---

## 🔢 Scoring System (Effort + Impact + Risk)

Each flagged file gets three scores:

### Effort (0–10)

- **0** = trivial (≤1 hr, rename/extract)
- **5** = moderate (custom hook extraction, state refactor, 2–4 hrs)
- **10** = major rewrite, multi-day effort

### Impact (0–10)

- **0** = negligible effect
- **5** = moderate clarity or bug reduction
- **10** = high leverage (major complexity/perf gain, reduces defect risk)

### Risk (0–10)

- **0** = safe, isolated, good coverage
- **5** = moderate risk, shared components, regression testing needed
- **10** = very risky, core business logic, weak test coverage

### Total Score Calculation

```
Total Score = Effort + Impact + Risk
```

**Prioritization:** Work **lowest Total Score first** (best ROI).

---

## Output Requirements

### 1) `/refactor/INDEX.md`

**Overview Table** with columns:

| File | LOC | Max Complexity | JSX Depth | Issues Count | Effort | Impact | Risk | Total Score | Report |
|------|-----|---------------|-----------|--------------|--------|--------|------|-------------|--------|

**Contents:**

1. **Top 10 Targets** (lowest Total Score first)
2. **Theme Insights:** common smells & recommended patterns (custom hooks, container/presentational, composition, design tokens, virtualization, etc.)
3. **3-Phase Plan:** quick wins → structural refactors → performance/polish
4. **Risk & Mitigation:** test coverage, feature flags, incremental extraction

### 2) `/refactor/<mirrored-path>/<FileName.ext>.md`

**Mirror the source tree under `/refactor/`**

Example: `src/components/UserCard.tsx` → `/refactor/src/components/UserCard.tsx.md`

**Per-file template:**

```markdown
# Refactor Report — <relativePath>/<FileName.ext>

## Metrics

- **LOC:** NNN
- **Exported Components:** N
- **Functions:** N (max complexity: X)
- **JSX Depth:** X
- **Hooks per main component:** N
- **Props on main component:** N

## Scoring

- **Effort:** #
- **Impact:** #
- **Risk:** #
- **Total Score:** # (Effort + Impact + Risk)

## Key Findings

### Issue 1 — [Title]

**Evidence:** pointer (function/line span)
**Why it's a problem:** explanation

### Issue 2 — [Title]

...

## Refactor Suggestions (Prioritized)

### 1. [Action Title]

- **Action:** Extract `useUserProfile` hook
- **Pattern:** Custom Hook
- **Effort/Impact/Risk:** #/#/#
- **Guidance:** Steps to implement safely

### 2. [Action Title]

...

## Quick Wins

- 3–5 small structural cleanups

## Test Considerations

- Which snapshot/unit/integration tests to run

## Before/After Sketch

```tsx
// Before: inline data-fetch
useEffect(() => { ... }, [])

// After: extracted hook
const data = useUserProfile()
```

## Related Files

- Imports/consumers affected

## Decision Log Notes

- Trade-offs, assumptions
```

---

## Execution Steps

1. **Discover candidates:** find `**/*.{js,jsx,ts,tsx}` (exclude tests, stories, builds)
2. **Measure & analyze:** compute LOC, complexity, JSX depth, hooks/props count
3. **Score:** assign Effort, Impact, Risk (0–10) → Total Score
4. **Write outputs:**
   - `/refactor/INDEX.md` with table + summary
   - `/refactor/<relativePath>.md` with detailed report
5. **No code changes** — only Markdown outputs

---

## Acceptance Checklist

- [ ] `/refactor/INDEX.md` exists and sorted by **Total Score ascending**
- [ ] Every flagged file has a `.md` report with Metrics, Findings, Suggestions, Scoring
- [ ] Each suggestion includes Effort, Impact, Risk scores
- [ ] No source files modified
- [ ] All paths are relative to repo root

---

## Expected Output

⚡ This ensures you get a **scored, prioritized backlog of refactor tasks**, with lowest-effort/lowest-risk/highest-impact work surfaced first.

The resulting `/refactor/` directory will contain:
- A master INDEX.md with prioritized refactor targets
- Individual detailed reports for each flagged file
- Actionable recommendations with effort/impact/risk scoring
- No changes to source code whatsoever
