# Homista implementation plan

**Status date:** 26 September 2026  
**Product focus:** Home construction planning for homeowners in Bengaluru first, with an India-ready foundation.

This plan turns the Homista product direction discussed in the earlier planning conversation into an incremental build sequence. It uses the repository as the source of truth for what is already implemented. Feature ideas are not treated as shipped functionality until they meet the acceptance criteria below.

## Product outcome

Help a homeowner understand, organize, and track a home construction project from early planning through construction. Homista should make assumptions visible, keep project information in one place, and help the owner make better-informed decisions with their architect, contractor, and suppliers.

The first product should be useful without AI or a supplier marketplace. Estimates must be explainable and traceable to user inputs or dated local sources. Homista must not present planning figures as a contractor quote or professional engineering advice.

## Target user and initial scope

- **Primary user:** an individual or family planning a new home or major home build.
- **Initial launch area:** Bengaluru and nearby areas, while allowing projects elsewhere in India.
- **First supported platform:** responsive web preview and Expo mobile app; validate web and native behavior separately.
- **Default units:** INR and square feet, with the data model kept ready for explicit unit and locale choices later.
- **Primary workflow:** sign in → create a project → describe the home → plan a cost → track decisions and actual progress.

## Current repository baseline

### Implemented

- Expo / React Native TypeScript client in `mobile/`.
- Firebase phone OTP sign-in, exchanged for a revocable Homista API session.
- FastAPI API in `backend/`, with SQLAlchemy models and Alembic migrations.
- Authenticated, owner-scoped project create/list/update operations.
- Project profile fields: name, location, home type, plot area, built-up area, floors, and construction quality.
- A client-side build-cost calculator. The homeowner enters a local rate per square foot and an optional reserve; the result is not saved as an estimate record.
- CI and starter API/browser checks under `.github/` and `qa/`.

### Known gaps in the current baseline

- Cost calculations are transient client state: no estimate history, editing, or sharing.
- No Homista-maintained local rate catalog and no validated construction cost benchmarks.
- No materials quantities, bill of quantities (BOQ), budgets, expense tracking, or construction schedule.
- No document storage, quote comparison, supplier directory, or AI assistant.
- Local browser/API processes and production hosting are not a reliable release setup; environment and deployment workflows need to be made repeatable.
- Browser preview, Firebase web authentication, API CORS, and native development builds need end-to-end checks on their supported environments.

## Product principles and guardrails

1. **Show the basis of every number.** Record the area, rate, unit, location, date, inclusions, exclusions, and source used. Clearly distinguish user-entered inputs from Homista reference data.
2. **Do not invent market rates or quantities.** Add benchmark rates or BOQ formulas only after local validation with qualified construction professionals and dated source material.
3. **Keep estimates editable and versioned.** Recalculation should preserve prior versions and show what changed.
4. **Separate construction cost from total project cost.** Land, design, approvals, taxes, utilities, interiors, financing, and contingency must be explicitly included or excluded.
5. **Protect project ownership.** Every project, estimate, document, and future collaboration action must be scoped to the authenticated owner and authorized collaborators.
6. **Keep AI advisory and traceable.** AI output must cite the project data or source documents it used, indicate uncertainty, and defer technical and safety decisions to qualified professionals.
7. **Build in small releases.** Each milestone must have a working user flow, acceptance checks, migration plan where needed, and a clear rollback path.

## Roadmap

### Milestone 0 — Make the current app dependable

**Goal:** A signed-in homeowner can use the existing project workspace reliably in supported development environments.

**Work**

- Document one canonical local setup for the API and mobile web app, including supported Node/Python versions and environment variables.
- Make startup errors clear when the API, Firebase settings, or database are unavailable.
- Confirm project-card navigation, home-profile editing, and the current calculator on mobile web and an Expo native development build.
- Verify CORS origins for local web ports and document the chosen development port behavior.
- Keep secrets out of the repository; document safe local configuration and production identity setup.

**Acceptance**

- A developer can start the API and app from a clean checkout by following the docs.
- A signed-in user can open a project, save home details, calculate a cost, sign out, and sign in again without losing server-stored project details.
- User A cannot read or modify User B's project by changing an ID.
- CI validates migrations, API contracts, mobile types, and a browser smoke flow.

### Milestone 1 — Save and explain cost estimates

**Goal:** Turn the current calculator into a project feature with saved, reproducible estimate versions.

**Work**

- Add estimate and estimate-version records linked to a project and owner.
- Persist built-up area, rate, currency, reserve percentage, calculated totals, creation time, and a user-provided rate note/source.
- Keep the current manual-rate workflow; do not silently fill in a Homista market rate.
- Add estimate history, edit/recalculate, and a clear breakdown of base amount and reserve.
- Store calculation inputs and formula version so old estimates remain interpretable after formula changes.
- Add API endpoints for create, list, read, and versioned recalculation, all owner-scoped.

**Acceptance**

- An estimate remains after sign-out, refresh, and sign-in on another supported device.
- Each estimate shows its inputs, result, currency, reserve, and inclusions/exclusions.
- Recalculation creates a new version and does not silently overwrite the previous result.
- Invalid, missing, and implausible input values produce useful validation errors.

### Milestone 2 — Materials quantities and BOQ

**Goal:** Provide a transparent preliminary quantity plan that a professional can review.

**Work**

- Define the supported scope (for example, structural shell only) before calculating quantities.
- Work with Bengaluru construction professionals to validate formulas, wastage assumptions, units, and reference sources.
- Model each line item with quantity, unit, formula/assumption, source, scope, and optional user override.
- Present quantities separately from prices; price each line only when a dated local rate is supplied or selected.
- Allow the homeowner or professional to mark quantities reviewed and record adjustments with a reason.

**Acceptance**

- Every quantity exposes its calculation basis and scope.
- The UI labels preliminary quantities as planning figures pending professional review.
- Unit conversions and rounding are consistent and covered by API calculation checks.
- Unknown inputs are requested or visibly excluded; the system does not fill gaps with hidden defaults.

### Milestone 3 — Budget and actual spending

**Goal:** Let owners compare a project budget with committed and paid costs.

**Work**

- Add budget categories, line items, planned amounts, commitments, actual transactions, dates, notes, and optional receipt references.
- Link budget lines to estimate/BOQ items where useful while permitting manual items.
- Show planned vs committed vs paid totals and remaining budget.
- Make every change auditable and allow corrections without erasing history.

**Acceptance**

- Totals are derived from saved line items and transactions, not entered separately.
- Users can distinguish a quote, a commitment, and a payment.
- Currency and project ownership are consistent across estimates and budget entries.
- Deleting or correcting an entry preserves an appropriate history.

### Milestone 4 — Timeline and progress tracking

**Goal:** Give the homeowner a manageable view of work, milestones, dependencies, and delays.

**Work**

- Add project phases, milestones, tasks, planned dates, actual dates, status, owner, dependencies, and notes.
- Start with editable templates reviewed for the Bengaluru pilot; avoid presenting templates as mandatory or universal.
- Show upcoming, overdue, blocked, and completed work with a simple project timeline.
- Add optional reminders only after notification preferences and delivery behavior are defined.

**Acceptance**

- Owners can edit template dates and tasks before using them.
- A dependency or date change updates affected schedule views and clearly identifies the change.
- Progress is based on task/milestone state and is not implied to certify construction quality.

### Milestone 5 — Documents and collaboration

**Goal:** Keep plans, permits, contracts, quotes, and project decisions together with controlled access.

**Work**

- Add private document metadata and secure object storage; store file contents outside the relational database.
- Support versioning, categories, upload dates, notes, and links to estimates, tasks, or quotes.
- Define owner-invited collaborator roles and revoke access reliably before adding shared access.
- Add an activity history for important project edits and document events.

**Acceptance**

- Files are private by default and require an authorized session to download.
- Owners can see who added or changed project records.
- Invited roles have explicit, tested read/write permissions and can be revoked.
- File size/type limits and retention/deletion behavior are documented.

### Milestone 6 — Construction copilot and quote review

**Goal:** Help users understand project material without making unsupported claims.

**Work**

- Begin with retrieval over documents and project data the current user is authorized to access.
- Return citations to the exact document or project record used and allow the user to open that source.
- Clearly label generated summaries and questions; require professional review for design, structural, code, safety, and financial decisions.
- Add quote comparison only after a consistent line-item schema and unit normalization exist.
- Measure answer quality on a curated test set before widening availability.

**Acceptance**

- Answers are limited to authorized project sources and include source references.
- The system says when evidence is missing instead of inventing quantities, rates, or regulatory requirements.
- Prompt-injection text inside uploaded documents cannot authorize data access or external actions.
- Users can report a poor answer and see that generated content is not professional certification.

### Milestone 7 — Supplier discovery and commercial services

**Goal:** Help owners find and compare suppliers only after planning data is trustworthy.

**Work**

- Validate homeowner and supplier demand in the Bengaluru pilot before building a marketplace.
- Define supplier verification, service areas, quote lifecycle, ranking transparency, conflict handling, and paid-placement disclosure.
- Make supplier contact and quote sharing explicit user actions.
- Keep supplier-provided prices dated, location-scoped, and distinct from Homista estimates.

**Acceptance**

- Users understand why a supplier is shown and whether placement is sponsored.
- Quotes are comparable by scope, unit, exclusions, and validity date.
- No project information is shared with a supplier without the user's action.

## Technical delivery plan

### Application and API

- Keep `mobile/` focused on presentation and client-side input validation; move persisted product calculations and authorization decisions to the API.
- Keep `backend/` authoritative for users, projects, saved estimates, budgets, schedules, and permissions.
- Use additive Alembic migrations and test migration from the previous released schema before deploy.
- Keep API request/response schemas versioned and return user-safe validation errors.
- Use PostgreSQL for shared environments; SQLite remains a local development option unless a feature depends on PostgreSQL behavior.

### Security and privacy

- Verify Firebase ID tokens server-side and use revocable, expiring Homista sessions.
- Enforce owner/collaborator authorization for every object lookup and mutation.
- Store secrets in environment/secret managers, not source control or client bundles.
- Apply rate limits to authentication and costly AI/file operations; log security-relevant events without logging tokens or OTPs.
- Define data retention, export, deletion, consent, and incident response before production launch; obtain India-specific legal review for applicable privacy requirements.

### Quality gates

- **API:** authorization boundaries, schema validation, calculations, migrations, and error behavior.
- **Mobile:** TypeScript checks and accessible control labels for critical flows.
- **Browser:** sign-in/project navigation smoke flow, project detail editing, and calculator interaction.
- **Native:** development-build checks on supported iOS/Android versions before store distribution.
- **Release:** migration backup/restore plan, health checks, observability, rollback instructions, and a staging sign-off.

## Release sequence and prioritization

1. Finish Milestone 0 reliability checks and remove stale documentation.
2. Deliver Milestone 1 saved estimates; this is the immediate next product milestone.
3. Validate Milestone 2 formulas with local professionals before implementation.
4. Build budget tracking, then schedule tracking, using the validated estimate/BOQ model.
5. Add private documents and collaboration before AI document assistance.
6. Consider supplier discovery only after a real pilot confirms the workflow and trust model.

At each milestone, ship a narrow end-to-end workflow behind clear user-facing language. Revisit scope with pilot users rather than expanding screen or endpoint counts as a goal by itself.

## Decisions to resolve before production launch

- Production hosting/provider, regions, database backups, monitoring, and deployment owner.
- Firebase/Google Cloud project billing and production SMS budget/limits.
- User identity and account recovery policy.
- Estimate source policy and professional review process for rates and BOQ formulas.
- Project sharing roles, file retention, data export/deletion, and privacy/legal review.
- Pilot success measures, such as activation, estimate completion, repeat project use, and user-reported estimate usefulness.

## Definition of done for a milestone

- The user flow works from the app UI through the API and persistence where applicable.
- Acceptance criteria are met and critical authorization boundaries are checked.
- API and UI behavior have appropriate automated checks in CI.
- Schema changes are migration-backed and safe to deploy.
- Setup, architecture, and release documentation match the shipped behavior.
- Known limitations and the next user-facing step are stated in release notes.
