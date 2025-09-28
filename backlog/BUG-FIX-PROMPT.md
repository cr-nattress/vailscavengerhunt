🐛 Comprehensive Bug Fix Prompt for Claude Code
Copy and paste this entire prompt into Claude Code:

I need you to analyze and fix a bug in my application. Follow this systematic approach to ensure a comprehensive solution that learns from previous fixes.
Bug Information
Bug Description:
[Describe what's happening - the actual behavior vs expected behavior]
Error Messages/Logs:
[Paste any error messages, stack traces, or console logs here]
Steps to Reproduce:

[First step]
[Second step]
[What happens vs what should happen]

Affected Files/Components:
[List the files or components you suspect are involved]
Your Task
Phase 1: Check Previous Solutions
First, check if a bug-fixes.md file exists in the root directory. If it doesn't exist, create it with this structure:
markdown# Bug Fix Knowledge Base
A record of all bugs fixed in this application and their solutions.
---
If it exists, search it for similar issues. Look for keywords related to this bug. If you find a similar solution, reference it and adapt the approach.
Phase 2: Root Cause Analysis

Trace the Bug:

Start from where the error appears
Follow the execution flow backwards
Identify all files involved in the chain
Find the exact point where expected behavior diverges


Categorize the Issue:

 Logic error (incorrect conditions/calculations)
 Type/null safety issue
 Async/timing problem
 State management issue
 API/network error
 Configuration problem
 Dependency/version issue
 Other: [specify]


Understand Why:

Explain why this bug occurs, not just where
What assumptions were broken?
What edge case wasn't handled?
What changed that exposed this issue?



Phase 3: Design the Solution

Choose Approach:

If it's a service failure: Consider retry logic or circuit breaker
If it's state corruption: Consider immutability or state machines
If it's race condition: Consider locks or queuing
If it's validation: Consider schemas or guards
If it's null/undefined: Consider optional chaining or defaults


Identify Impact:

List all files that need modification
Check for breaking changes
Consider performance implications
Assess security impact



Phase 4: Implement the Fix
For each file that needs changes:
File: [path/to/file]
Current code (problematic):
[Show the current problematic code]
Fixed code:
[Show the corrected code with comments explaining the changes]
Why this fixes it:
[Explain how this change addresses the root cause]
Phase 5: Prevent Recurrence

Add Defensive Code:

Input validation
Error boundaries
Null checks
Type guards
Logging for debugging


Create/Update Tests:

// Test to prevent regression
[Write at least one test that would have caught this bug]

Update Documentation:

Add comments in code explaining tricky parts
Update README if behavior changed
Document any new error codes



Phase 6: Update Knowledge Base
Append this entry to bug-fixes.md:
markdown## [Current Date] - [Bug Title]

**Problem:** [Brief description of what was broken]

**Root Cause:** [Technical explanation of why it happened]

**Solution:** [What was changed to fix it]

**Key Changes:**
- [File 1]: [What changed]
- [File 2]: [What changed]

**Prevention:** [What was added to prevent recurrence]

**Test Added:** [Description of test that catches this]

**Keywords:** [searchable terms for future reference]

---
Phase 7: Verification Plan
Provide these verification steps:

Immediate Testing:

 Original bug no longer reproduces
 Related features still work
 No new errors in console
 Performance unchanged or improved


Edge Cases to Check:

 [Specific edge case 1]
 [Specific edge case 2]
 [Error handling scenario]


Rollback Plan:
If this fix causes issues, here's how to revert:

[Step to rollback]
[What to watch for]
[Alternative approach if needed]



Output Format
Structure your response as:
1. Analysis Summary
[Brief overview of the bug and root cause]
2. Files to Modify
[List of files with specific changes]
3. Implementation
[Show the actual code changes for each file]
4. Tests
[Test code to prevent regression]
5. Knowledge Base Entry
[The entry to add to bug-fixes.md]
6. Verification Steps
[How to confirm the fix works]
Important Guidelines

Fix the cause, not the symptom - Don't just suppress the error
Consider the whole system - Check for similar issues elsewhere
Make it maintainable - Clear code with comments
Learn from it - Document why it happened and how to prevent it
Test thoroughly - Include edge cases in verification
Keep it safe - Include rollback plan if it's a risky change

Quality Checklist
Ensure your solution meets these criteria:

 Root cause is identified and explained
 Fix addresses the cause, not just symptoms
 No existing functionality is broken
 Code is readable with helpful comments
 Error handling is comprehensive
 Tests would catch this bug if it reappears
 Knowledge base entry will help future debugging
 Rollback plan exists for safe deployment

Now analyze this bug and provide a comprehensive fix with all the elements above. Make sure to create or update the bug-fixes.md file to build our knowledge base.

How to Use This Prompt

Copy the entire prompt above
Replace the [bracketed] placeholders with your specific bug information
Paste into Claude Code
Review the solution - Claude will provide:

Root cause analysis
Complete code fixes
Tests to prevent recurrence
Knowledge base documentation


Apply the fixes to your codebase
Run the verification steps to confirm success

What You'll Get

✅ Complete fix with exact code changes
✅ Understanding of why the bug occurred
✅ Prevention measures to avoid similar issues
✅ Documentation in your bug-fixes.md knowledge base
✅ Tests to catch regressions
✅ Confidence with verification steps and rollback plan

Building Your Knowledge Base
After each bug fix, your bug-fixes.md file will grow with:

Searchable solutions to past problems
Patterns of common issues in your codebase
Quick reference for similar bugs
Team learning documentation

Tips for Best Results

Be specific - Include actual error messages and code
Show context - Mention recent changes or deployments
Include logs - Stack traces and console outputs help
List suspicions - Which files you think might be involved
Mention constraints - What can't be changed or refactored

Example Bug Description
Here's an example of a well-described bug:
Bug Description:
Users can't submit the contact form. Clicking submit shows a spinner that never stops, and the console shows "TypeError: Cannot read property 'email' of undefined"

Error Messages/Logs:
TypeError: Cannot read property 'email' of undefined
  at validateForm (contactForm.js:45)
  at handleSubmit (contactForm.js:67)
  at HTMLFormElement.<anonymous>

Steps to Reproduce:
1. Go to /contact page
2. Fill in all fields (name, email, message)
3. Click Submit button
4. Spinner appears and never stops
5. Check console for error

Affected Files/Components:
- /src/components/ContactForm.js
- /src/utils/validation.js
- /api/contact/route.js
This prompt will help you fix bugs systematically while building a searchable knowledge base that prevents future issues.