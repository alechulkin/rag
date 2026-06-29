---

name: product-lens
description: "Validate the product why before building, run product diagnostics, and pressure-test product direction before turning a request into an implementation contract."
metadata:
origin: ECC
target: cursor
--------------

# Product Lens — Think Before You Build

Use this skill before turning a product idea into engineering work.

This skill owns **product diagnosis**, not implementation-ready specification writing.

It answers:

```text
Should we build this?
Who is it for?
What pain does it solve?
What is the smallest useful proof?
How will we know it worked?
```

If the idea passes product validation and needs an implementation-ready artifact, hand off to:

```text
product-capability
```

That next skill should convert the product brief into a durable capability contract, PRD/SRS, or engineering-ready plan.

## When to Use

Use this skill:

* Before starting a new feature
* When a user asks for implementation but the product goal is unclear
* During weekly product review
* When choosing between competing feature ideas
* Before launch, to sanity-check the user journey
* When converting a vague idea into a product brief before engineering planning starts
* When the team risks building “interesting” work that may not matter

Do not use this skill for:

* Small bug fixes
* Pure refactoring
* Already-approved implementation tickets
* Low-risk internal cleanup
* Tasks where the product contract is already clear

## Mode 1: Product Diagnostic

Use this mode before building a new feature.

Ask the hard questions:

```text
1. Who is this for?
   Be specific. Avoid vague personas like "developers" or "users".

2. What is the pain?
   How often does it happen?
   How painful is it?
   What do they do today?

3. Why now?
   What changed that makes this possible, urgent, or necessary?

4. What is the 10-star version?
   If time and money were unlimited, what would the best possible experience be?

5. What is the MVP?
   What is the smallest thing that proves the thesis?

6. What is the anti-goal?
   What are we explicitly not building?

7. How do we know it is working?
   Define a metric, signal, or observable behavior. Avoid vibes.
```

Output:

```text
PRODUCT-BRIEF.md
```

The brief should include:

```text
- Target user
- Pain
- Current workaround
- Why now
- MVP
- Anti-goals
- Success metric
- Risks
- Go / no-go recommendation
- Next step
```

If the answer is “yes, build this,” hand off to `product-capability`.

Do not continue doing founder-theater after the product decision is clear.

## Mode 2: Founder Review

Use this mode to review an existing project through a founder/product lens.

Review available project context, such as:

```text
README.md
AGENTS.md
.cursor/rules/
.cursor/skills/
package.json
pyproject.toml
pom.xml
recent commits
docs/
pricing or billing code
public landing page if available
```

Infer:

```text
What is this product trying to become?
Who is it for?
What is the main value promise?
What is the activation moment?
What is the strongest product-market-fit signal?
What is missing?
```

Score product-market-fit signals from 0 to 10:

```text
- Usage growth trajectory
- Retention indicators
- Repeat users or repeat contributors
- Revenue signals
- Pricing or billing readiness
- Competitive moat
- Time-to-value
- User urgency
```

Output:

```text
FOUNDER-REVIEW.md
```

Include:

```text
- Product thesis
- Strongest signal
- Weakest signal
- One thing that could 10x the product
- Things being built that probably do not matter
- Recommended next product move
```

## Mode 3: User Journey Audit

Use this mode to inspect the actual user experience.

Steps:

```text
1. Start as a new user.
2. Try to install, run, or use the product.
3. Document every friction point.
4. Time each major step.
5. Identify the first user win.
6. Compare the journey to obvious alternatives or competitors when relevant.
7. Recommend the top 3 onboarding fixes.
```

Look for:

```text
- confusing setup
- missing docs
- unclear first action
- broken commands
- missing examples
- bad error messages
- unclear pricing or access model
- slow time-to-value
```

Output:

```text
USER-JOURNEY-AUDIT.md
```

Include:

```text
- First-user path
- Time-to-value
- Friction points
- Failed expectations
- Screenshots if UI/browser work was performed
- Top 3 fixes
- Severity of each issue
```

If browser validation is needed, use the project’s browser QA workflow or Cursor-compatible browser testing setup.

## Mode 4: Feature Prioritization

Use this mode when there are many feature ideas and only a few should be built.

Steps:

```text
1. List candidate features.
2. Score each feature.
3. Rank by impact, confidence, and effort.
4. Apply constraints.
5. Produce a short roadmap.
```

Default scoring:

```text
ICE = Impact × Confidence ÷ Effort
```

Score each from 1 to 5:

```text
Impact:
How much would this move the product forward?

Confidence:
How sure are we that the feature matters?

Effort:
How costly is it to build, launch, and maintain?
```

Also consider:

```text
- runway
- team size
- dependencies
- technical risk
- opportunity cost
- user urgency
- strategic fit
```

Output:

```text
FEATURE-PRIORITIZATION.md
```

Include:

```text
- Feature list
- ICE score
- Ranking
- Rationale
- Recommended top 1-3 features
- Explicit deprioritized items
```

## Mode 5: Launch Readiness Review

Use this before shipping a meaningful feature or product update.

Check:

```text
- Who will use it?
- How will they discover it?
- What is the first successful action?
- What can break?
- What support burden can it create?
- What metric should move?
- What rollback or kill-switch exists?
```

Output:

```text
LAUNCH-READINESS.md
```

Include:

```text
- Launch summary
- Target users
- Activation path
- Success metric
- Known risks
- Support/docs gaps
- Go / no-go recommendation
```

## Product Brief Template

Use this structure:

```markdown
# Product Brief

## Product Question

What are we deciding?

## Target User

Who is this specifically for?

## Pain

What painful situation do they have?

## Current Workaround

What do they do today?

## Why Now

What changed?

## Proposed Solution

What are we considering building?

## MVP

What is the smallest version that proves the thesis?

## Anti-Goals

What are we explicitly not building?

## Success Metric

How will we know it works?

## Risks

What could make this fail?

## Recommendation

Go / no-go / learn more.

## Next Step

The next concrete action.
```

## Output Standard

All modes must produce actionable docs, not essays.

Every recommendation must have:

```text
- specific next step
- owner or responsible role if known
- evidence or assumption behind the recommendation
- risk or uncertainty
```

Avoid vague recommendations like:

```text
Improve onboarding.
Make it easier to use.
Add more polish.
Talk to users.
```

Prefer concrete recommendations:

```text
Add a 5-minute quickstart that gets the user from clone to first successful API call.
Instrument activation as "first successful document upload."
Remove the advanced config step from the default onboarding path.
Interview 5 users who tried setup but did not reach the first successful run.
```

## Integration

Pair this skill with:

```text
product-capability
```

when the product brief needs to become an implementation-ready capability plan.

Pair with browser QA when validating an actual UI journey.

Pair with design-system review when the product risk is visual clarity, UX consistency, or interaction quality.

Pair with launch or monitoring workflows when validating post-launch behavior.

## Anti-Patterns

Avoid:

```text
- Turning vague product ideas directly into implementation tickets
- Asking engineering to build before the user/pain is clear
- Treating founder enthusiasm as evidence
- Building for a generic "developer" persona
- Defining success as "feature shipped"
- Creating long product docs with no decision
- Continuing product debate after the build/no-build decision is clear
- Confusing PRD writing with product diagnosis
```

## Final Rule

Before building, answer:

```text
Who is this for?
What pain does it solve?
Why now?
What is the smallest proof?
How will we know it worked?
What are we not building?
```

If those answers are weak, do not proceed to engineering planning yet.

If those answers are strong, hand off to `product-capability`.
