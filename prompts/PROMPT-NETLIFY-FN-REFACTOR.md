Prompt: Netlify Functions Refactor Audit → Markdown Reports with Scoring

Role: You are a senior backend/serverless engineer and refactor strategist.
Goal: Analyze the repository’s Netlify Functions (/netlify/functions/*.{js,ts}) for size, complexity, and adherence to serverless best practices. Generate Markdown reports (one per flagged function file) into /refactor/** without changing any source code.

Scope & Rules

Do not modify or reformat application code.

Only create files under /refactor/:

/refactor/INDEX.md — master summary & prioritized plan

/refactor/<mirrored-path>/<FileName.ext>.md — one report per flagged function

Treat repo root as . (working directory).

Prefer TypeScript-aware checks if .ts files exist.

Focus only on Netlify Functions code.

How to Detect “Too Large” & “Needs Refactor”
Size & Complexity Thresholds

Flag if any exceed:

LOC > 150 (function handler file)

Cyclomatic complexity > 10 per handler or helper

File exports > 1 handler (serverless should be single-purpose)

3 nested try/catch blocks or conditional branches

Large inline logic (>100 LOC inside handler)

Serverless/Netlify Best-Practice Checks

Single Responsibility: handler should serve one route/one purpose.

Cold Start Awareness: heavy imports (e.g. full aws-sdk) or expensive top-level code.

Async/await hygiene: missing await, unhandled promise rejections.

Error Handling: missing standardized error responses (HTTP 4xx/5xx with JSON).

Logging: no structured logs or inconsistent formats.

Input Validation: no schema validation (Zod, Joi, Yup).

Security: secrets not loaded from process.env; credentials in code.

Performance: no timeouts, retries, or external API error handling.

Code Duplication: repeated logic (auth, validation, DB connect) across multiple functions (needs shared utils).

Testing: absence of mocks/coverage for handler logic.

Deployability: large bundle size from unused imports, lack of tree-shaking.

🔢 Scoring System (Effort + Impact + Risk)

Assign numeric scores (0–10):

Effort (0–10):

0 = trivial cleanup

5 = medium refactor (extract shared util, add validation)

10 = major rewrite

Impact (0–10):

0 = negligible

5 = moderate (more maintainable/error-proof)

10 = critical (security, reliability, cost reduction)

Risk (0–10):

0 = isolated, safe

5 = moderate (shared endpoint, regression possible)

10 = core function, weak test coverage

➡️ Total Score = Effort + Impact + Risk
➡️ Prioritization: Work lowest Total Score first.

Output Requirements
1) /refactor/INDEX.md

Overview Table:
File | LOC | Max Complexity | Issues Count | Effort | Impact | Risk | Total Score | Report

Top 10 Targets sorted by lowest Total Score.

Theme Insights: common smells (duplicate auth logic, oversized handlers, no validation, etc.).

3-Phase Plan: quick wins → structural refactors → performance/security upgrades.

Risk & Mitigation: regression testing, feature flags, staged deploys.

2) /refactor/<mirrored-path>/<FileName>.md

Mirror the original path. Example:
/netlify/functions/sendEmail.ts → /refactor/netlify/functions/sendEmail.ts.md

Per-file report template:

# Refactor Report — netlify/functions/sendEmail.ts

**Metrics**
- LOC: 175
- Functions: 3 (handler + 2 helpers)
- Max Cyclomatic Complexity: 12
- Exports: 1 handler, 2 utility functions

**Scoring**
- Effort: 4
- Impact: 8
- Risk: 3
- **Total Score: 15**

**Key Findings**
- Handler contains inline DB query logic (100+ LOC).
- No input validation on POST body.
- Secrets hardcoded instead of `process.env`.

**Refactor Suggestions**
- **Action:** Extract DB logic into `/lib/db.ts`.  
- **Pattern:** Single Responsibility + Shared Utility.  
- **Effort/Impact/Risk:** 4/8/3  
- **Guidance:**  
  1. Move DB connection/query to util.  
  2. Import util in function.  
  3. Add schema validation with Zod.  

**Quick Wins**
- Standardize error responses.  
- Add `try/catch` for API failure handling.  
- Use `console.log(JSON.stringify(...))` for structured logs.  

**Test Considerations**
- Add unit tests for validation + error paths.  
- Ensure staging deploy before prod cutover.  

**Before/After Sketch**
```ts
// Before
exports.handler = async (event) => {
  const body = JSON.parse(event.body)
  // inline query + error handling...
}

// After
import { queryUser } from "../lib/db"
exports.handler = async (event) => {
  const { email } = validateBody(event.body)
  return { statusCode: 200, body: JSON.stringify(await queryUser(email)) }
}


Related Files

/lib/db.ts (to be created)

Other functions importing similar DB logic.

Decision Log Notes

Risk mitigated by staging deploy + regression tests.


---

## Execution Steps

1. **Discover candidates**: scan `/netlify/functions/*.{js,ts}`.  
2. **Measure & analyze**: LOC, complexity, duplication, cold-start imports.  
3. **Score** each function (Effort, Impact, Risk → Total).  
4. **Write outputs**:  
   - `/refactor/INDEX.md` with summary table sorted by **Total Score ascending**.  
   - `/refactor/<relativePath>.md` detailed reports.  
5. **No source code changes** — only Markdown outputs.

---

## Acceptance Checklist

- [ ] `/refactor/INDEX.md` exists with lowest-score-first ordering.  
- [ ] Each flagged function has a Markdown report.  
- [ ] Each report includes Metrics, Findings, Suggestions, Scoring.  
- [ ] No function code modified.  
- [ ] All report paths mirror the repo structure.  

---

⚡This produces a **prioritized refactor backlog** for Netlify Functions, ensuring the easiest + safest + highest-impact fixes are tackled first.  