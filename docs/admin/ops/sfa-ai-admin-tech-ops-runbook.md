# Shoot For Arts AI Admin Tech Ops Runbook

## 1. Purpose

I use this runbook to ship, validate, monitor, and recover the Shoot For Arts AI admin add-on.

I am assuming this architecture:

- frontend remains this existing React/Vite admin
- AI runs from Supabase Edge Functions in the existing backend
- OpenAI is the model provider
- humans review drafts before anything is sent
- the current approved send path is manual send confirmation, not live provider send from the UI

---

## 2. System Boundary

This repo is my frontend.

This AI feature spans two delivery surfaces for me:

- this frontend repo for admin UI changes
- the existing Supabase/backend project for Edge Functions, migrations, and secrets

I do not want the AI add-on to break:

- public contact submission
- admin login
- existing admin dashboard usage
- gallery and upload workflows

If AI has issues, I still need the base inquiry workflow to work.

---

## 3. Operating Baseline

I am already using:

- Vercel for frontend hosting
- Supabase for auth, database, storage, and Edge Functions
- direct Supabase reads in admin for current data surfaces
- a central frontend API wrapper in `src/lib/api/services.ts`

I want the AI extension to follow the same baseline instead of introducing a separate server.

---

## 4. Environment and Configuration

## 4.1 Frontend flags

My recommended frontend flags:

- `VITE_ENABLE_AI_ADMIN`
- `VITE_AI_ADMIN_READONLY_MODE`
- `VITE_AI_ADMIN_DEBUG`
- optional future-only live send flag if provider send is reintroduced later

My rules:

- do not put secrets in `VITE_*`
- I want AI UI to stay hidden or harmless when the backend is not ready

## 4.2 Backend secrets

The backend-only secrets I need:

- `OPENAI_API_KEY`
- `OPENAI_MODEL_MAIN=gpt-5.4-mini`
- `OPENAI_MODEL_EXTRACT=gpt-5.4-nano`
- Supabase service-role credentials if used by trusted backend automation

My rules:

- never expose model keys to the browser
- keep model names configurable even if the defaults above are the chosen baseline

## 4.3 Environment tiers

I want to maintain at least:

- local
- preview/staging
- production

I do not want to enable AI in production first without exercising preview/staging.

---

## 5. Deployment Order

I want to deploy in this order:

### Step 1. Database

I apply:

- AI tables
- indexes
- RLS policies
- helper SQL functions if needed

### Step 2. Edge Functions

I deploy:

- `ai-analyze-inquiry`
- `admin-ai-save-draft-edit`
- `ai-approve-draft`
- `admin-ai-mark-draft-sent`
- `admin-ai-inbox`
- `admin-ai-inquiry`
- `admin-ai-mark-last-seen`
- any supporting internal read/write functions

### Step 3. Frontend

I deploy the admin UI with the feature flag still off or read-only.

### Step 4. Enablement

I only enable AI after validation passes:

- contact form still works
- AI analysis writes are succeeding
- dashboard fallbacks are safe
- approve/copy/manual-send-confirmation flow works for a real inquiry

---

## 6. Local Development Workflow

## 6.1 Frontend in this repo

I use the normal frontend flow:

```bash
npm install
npm run dev
```

The checks I want before shipping:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run seo:validate
npm run test:e2e:smoke
```

## 6.2 Backend AI work

If I am working in the Supabase/backend project, I serve the planned functions locally with the Supabase CLI.

Example:

```bash
supabase functions serve ai-analyze-inquiry --env-file .env.local
supabase functions serve admin-ai-save-draft-edit --env-file .env.local
supabase functions serve ai-approve-draft --env-file .env.local
supabase functions serve admin-ai-mark-draft-sent --env-file .env.local
supabase functions serve admin-ai-inbox --env-file .env.local
supabase functions serve admin-ai-inquiry --env-file .env.local
```

If the backend repo is not checked out locally, I keep the frontend flag off and treat the UI as blocked on backend readiness.

## 6.3 Local seed data

I use seed inquiries that match current Shoot For Arts services:

- `Grad Photoshoots` Tier 1
- `Base Photoshoot` with "Not sure - help me choose"
- `Event Photography` with multi-hour scope
- vague budget-sensitive portrait inquiry
- custom creative inquiry with missing date/location

That gives me realistic AI cases from the current form structure.

---

## 7. Release Gates

I do not want a release to ship unless all of the following are true.

### 7.1 Product gates

- AI remains an add-on inside the current admin dashboard
- no redesign of the admin shell shipped as part of AI
- no automatic sending is enabled by default

### 7.2 Backend gates

- AI functions authenticate correctly
- invalid model output is rejected safely
- duplicate runs are prevented or handled idempotently
- runs are logged with request/run identifiers

### 7.3 Frontend gates

- AI UI only appears for signed-in admins
- dashboard stays usable if AI endpoints fail
- raw inquiry detail remains available without AI data
- no AI loading state blocks the entire admin page

### 7.4 Quality gates

- lint passes
- typecheck passes
- unit tests pass
- smoke coverage for admin remains green

---

## 8. Post-Deploy Validation Checklist

After each meaningful AI deploy, I check the following:

## 8.1 Contact intake

- submit a real test inquiry through the public contact form
- verify the `contact_submissions` row exists
- verify the raw submission is unchanged and readable

## 8.2 AI backend

- verify `inquiry_ai_analysis` row exists
- verify `inquiry_ai_drafts` row exists
- verify `ai_runs` row shows the expected model name
- verify the run completed with `gpt-5.4-mini` unless intentionally testing another model

## 8.3 Admin dashboard

- sign into `/sfaadmin/login`
- open `/sfaadmin/dashboard`
- verify the existing dashboard still loads
- verify the AI summary card/module appears only when enabled
- open a reviewed inquiry and confirm the raw details, analysis, and draft all render

## 8.4 Draft review flow

- edit a draft
- verify a new draft version is created when appropriate
- verify the previous draft version still exists if versioning is used
- approve the current draft
- copy the draft
- manually send it outside the app
- mark it as sent
- verify sent state and audit trail update correctly

## 8.5 Current send posture

My rules:

- do not rely on live in-app provider send in the current approved workflow
- if live send code exists behind the scenes, treat it as inactive until explicitly re-approved
- manual send confirmation is the supported operational path for now

---

## 9. Logging and Observability

The minimum fields I want per AI run:

- `run_id`
- `contact_submission_id`
- `operation_type`
- `provider_name`
- `model_name`
- `prompt_version`
- `status`
- `latency_ms`
- `tokens_in`
- `tokens_out`
- `cost_estimate_usd`
- `error_code`
- `error_message`

The event types I want:

- `ai.inquiry.analysis.started`
- `ai.inquiry.analysis.succeeded`
- `ai.inquiry.analysis.failed`
- `ai.draft.rewrite.started`
- `ai.draft.rewrite.succeeded`
- `ai.draft.rewrite.failed`
- `ai.draft.approved`
- `ai.draft.copied`
- `ai.send.confirmed_manual`
- `ai.send.requested`
- `ai.send.failed`

My rules:

- do not log secrets
- avoid logging full submission bodies unless explicitly redacted and necessary
- keep enough identifiers to trace one inquiry across runs and approvals

---

## 10. Failure Modes and Responses

## 10.1 OpenAI outage or timeout

What I watch for:

- analysis never completes
- rewrite latency spikes
- repeated upstream failures

How I respond:

- mark the run failed
- show retry in admin
- keep manual inquiry handling available
- do not block the dashboard

## 10.2 Invalid or incomplete model output

What I watch for:

- JSON parsing failure
- missing recommendation data
- empty draft body

How I respond:

- fail closed
- do not store a successful analysis
- keep the raw inquiry visible
- retry only if the retry policy is explicit

## 10.3 Bad recommendation quality

What I watch for:

- wrong service/tier fit
- overpricing or underpricing
- weak clarifying questions

How I respond:

- keep human review mandatory
- inspect the catalog and rule grounding first
- review prompt version and sample cases
- do not move work to `gpt-5.4-nano` until quality is proven

## 10.4 Duplicate analysis runs

What I watch for:

- more than one active analysis for the same inquiry
- more than one initial draft when I only want one

How I respond:

- enforce idempotency on inquiry + operation type
- allow explicit manual regenerate only as a versioned action

## 10.5 Manual send mismatch or later send failure

What I watch for:

- approved draft exists but the UI state and real-world send status drift
- a manual send happened but the draft was not marked sent
- later provider-based send work fails in a partially completed way

How I respond:

- preserve the approved draft
- preserve the audit trail
- allow the admin to confirm manual send
- if provider send is ever reintroduced, do not let post-send persistence failures create easy duplicate-send retries

---

## 11. Rollback Strategy

## 11.1 Frontend rollback

If the AI UI causes issues:

- disable `VITE_ENABLE_AI_ADMIN`
- redeploy or roll back the frontend
- keep the rest of admin available

## 11.2 Backend rollback

If AI functions fail:

- disable AI trigger paths
- keep `contact-form` ingestion intact
- keep manual review on raw inquiries

## 11.3 Schema rollback

I prefer forward fixes over destructive rollback.

My recommended approach:

- leave AI tables in place
- stop writes if needed
- repair in a follow-up deploy

---

## 12. Backfill Procedure

When model behavior or prompts change materially, I backfill carefully.

My rules:

- never overwrite raw submissions
- never destroy approved draft history
- create new analysis/draft versions
- backfill in batches
- monitor latency and cost during backfill

My suggested order:

1. newest unanswered inquiries
2. newest in-review inquiries
3. historical inquiries used for evaluation

---

## 13. Manual Smoke Test

I run this after a meaningful release:

1. Submit a test inquiry through the real public form.
2. Confirm the contact submission lands.
3. Confirm AI analysis and an initial draft are created.
4. Log into the admin dashboard.
5. Confirm the AI summary card appears.
6. Open the inquiry and compare raw fields against the analysis.
7. Ask AI to shorten the draft.
8. Confirm a new draft version is saved.
9. Approve the new draft.
10. Copy the draft and send it manually outside the app.
11. Mark the draft as sent.
12. Confirm no automatic send occurs in the current approved workflow.

---

## 14. Operational Ownership

### Frontend owner

I expect this owner to handle:

- admin module rendering
- loading, error, and empty states
- feature flags
- preserving existing admin UX

### Backend owner

I expect this owner to handle:

- OpenAI integration
- AI function auth and validation
- schema, RLS, and idempotency
- run logging and recovery

### Product/business owner

I expect this owner to handle:

- catalog accuracy
- pricing/rule accuracy
- tone guidance
- approval policy

---

## 15. Non-Negotiables

- OpenAI stays in the backend
- `gpt-5.4-mini` is the main model for MVP
- humans review drafts before send
- AI does not redesign the admin
- AI failure must not break lead capture for me
