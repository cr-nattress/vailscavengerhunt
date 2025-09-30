Project Documentation Guidelines

File & Folder Documentation: At the top of each source file, include a brief comment describing its purpose. Note what the file exports (e.g. a component, hook, or API handler) and its role, and if it’s a Next.js client component (add the 'use client' directive) or a server component
nextjs.org
. Also mention how/where it’s used (for example, which route or feature module). Don’t duplicate metadata (dates, authors) in comments—use version control for history
stackoverflow.com
. In each feature folder, create a README.md that explains the feature’s purpose, lists its key entry points (main components, hooks, API routes, etc.), and outlines the data flow (for example: API → state/query → component). This gives developers a high-level map of the module.

Component Documentation: Use JSDoc or TypeScript to describe component APIs. Document each prop and its shape (and default) in comments or PropTypes. For example:

/**
 * Renders a user profile card.
 *
 * @prop user - User object (id, name, avatarUrl).
 * @prop showDetails - Toggles detail section.
 */
export function ProfileCard({ user, showDetails }: ProfileCardProps) { /*...*/ }


Tools like React Styleguidist will parse these JSDoc blocks and prop types for documentation
react-styleguidist.js.org
. For any complex or counterintuitive logic, add “Do/Don’t” comments to explain restrictions. For instance:

// ⚠️ This runs only on the server. Do not move inside a client component.


Such comments clarify why something cannot change, aligning with best practices that explain unidiomatic code to future readers
stackoverflow.blog
.

State & Data Flow Notes: Inline comments should clarify non-obvious state or transformations. For example:

// Keeps track of optimistic updates – must match the server shape.
const [draftTodo, setDraftTodo] = useState<Todo>()


If state mirrors a schema or API, link to it:

// Schema validated in /shared/lib/schemas/todo.ts


These annotations help readers understand the intended data shape and flow.

API & Server Actions: For API handlers and server actions, add comment blocks that act as lightweight contracts. Document the HTTP method, route, request and response formats, and possible errors. For example:

/**
 * POST /api/todo
 * Request:  { title: string }
 * Response: { id: string, title: string }
 * Throws:   400 if validation fails
 */
export async function createTodo(...) { /*...*/ }


Also note side effects or related logic in comments—e.g. which cache entries are invalidated, redirects performed, or retry logic applied.

Config & Environment Variables: In your config files (e.g. env.ts), define environment variables with Zod schemas and document each inline. For example:

// NEXT_PUBLIC_API_URL - Base URL for browser requests
// Must not include trailing slash
export const API_URL = env.NEXT_PUBLIC_API_URL;


This makes clear what each variable is for and any formatting constraints.

Error Handling & Boundaries: When catching errors, comment on why the catch is there. For example:

try {
  /* ... */
} catch (err) {
  // Expected: token expired → handled by redirect
  // Unexpected: log to Sentry
}


This tells future readers which errors are anticipated and how they’re dealt with, while distinguishing unexpected cases.

Flags & Conditional Code: If using feature flags or temporary code, annotate them. Prefix comments with the flag name, purpose, and expiration. For example:

// FEATURE_FLAG: enableNewCheckoutFlow
// Temporary until 2025-11-01. Delete after adoption.


This documents why the code exists and when it can be removed.

Automated Hints for Tools: Use structured comments for machine/AI parsing. For example:

// @ai-purpose: This component is pure UI; no API calls.
// @ai-dont: Change prop types without updating /shared/types/user.ts
// @ai-related-files: /features/user/api/getUser.ts


You can also define custom JSDoc tags. For instance, mark stable code with @stable (indicating it shouldn’t be changed) or extension points with @extension-point (safe to expand).

Tests as Documentation: Write tests with descriptive names and happy paths. For example:

test("submits form and shows success message", () => { /* ... */ });


Well-named tests serve as executable documentation. In fact, good test names help explain expected behavior, allowing developers to infer how the code should work just from the test suite
learn.microsoft.com
.

High-Level Architecture: Maintain a high-level architecture doc (e.g. docs/ARCHITECTURE.md) describing the overall structure. Include how features are organized, where state is held, naming conventions, and global rules (e.g. all HTTP calls must use http.ts wrapper). This architecture file should start with a bird’s-eye view and key entry points, include diagrams or maps of the code, and explain major design decisions
github.com
.

These practices create multiple layers of documentation: inline comments for local reasoning, module README/architecture docs for global context, and structured tags for automated reasoning. Together they guide developers and tools alike through the codebase.

Sources: Established documentation guidelines and style guides were consulted in crafting these standards