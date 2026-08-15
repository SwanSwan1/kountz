# BMAD Project

Ce projet utilise la methode BMAD. Les skills BMAD sont installes dans `.claude/skills/`.

## Commandes slash BMAD

Quand l'utilisateur tape `/bmad-<nom>`, lis le fichier `.claude/skills/bmad-<nom>/SKILL.md` et suis ses instructions exactement. Ne tente PAS d'utiliser le Skill tool — les skills BMAD sont des skills custom, pas des skills built-in.

### Skills disponibles

- `/bmad-advanced-elicitation` — Push the LLM to reconsider, refine, and improve its recent output. Use when user asks for deeper critique or mentions a known deeper critique method, e.g. socratic, first principles, pre-mortem, red team.
- `/bmad-agent-analyst` — Strategic business analyst and requirements expert. Use when the user asks to talk to Mary or requests the business analyst.
- `/bmad-agent-architect` — System architect and technical design leader. Use when the user asks to talk to Winston or requests the architect.
- `/bmad-agent-dev` — Senior software engineer for story execution and code implementation. Use when the user asks to talk to Amelia or requests the developer agent.
- `/bmad-agent-pm` — Product manager for PRD creation and requirements discovery. Use when the user asks to talk to John or requests the product manager.
- `/bmad-agent-tech-writer` — Technical documentation specialist and knowledge curator. Use when the user asks to talk to Paige or requests the tech writer.
- `/bmad-agent-ux-designer` — UX designer and UI specialist. Use when the user asks to talk to Sally or requests the UX designer.
- `/bmad-brainstorming` — Facilitate interactive brainstorming sessions using diverse creative techniques and ideation methods. Use when the user says help me brainstorm or help me ideate.
- `/bmad-check-implementation-readiness` — Validate PRD, UX, Architecture and Epics specs are complete. Use when the user says "check implementation readiness".
- `/bmad-checkpoint-preview` — LLM-assisted human-in-the-loop review. Make sense of a change, focus attention where it matters, test. Use when the user says "checkpoint", "human review", or "walk me through this change".
- `/bmad-code-review` — Review code changes adversarially using parallel review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) with structured triage into actionable categories. Use when the user says "run code review" or "review this code"
- `/bmad-correct-course` — Manage significant changes during sprint execution. Use when the user says "correct course" or "propose sprint change"
- `/bmad-create-architecture` — Create architecture solution design decisions for AI agent consistency. Use when the user says "lets create architecture" or "create technical architecture" or "create a solution design"
- `/bmad-create-epics-and-stories` — Break requirements into epics and user stories. Use when the user says "create the epics and stories list"
- `/bmad-create-prd` — DEPRECATED — consolidated into bmad-prd create intent - this skill will be removed in v7 in favor of `bmad-prd`.
- `/bmad-create-story` — Creates a dedicated story file with all the context the agent will need to implement it later. Use when the user says "create the next story" or "create story [story identifier]"
- `/bmad-customize` — Authors and updates customization overrides for installed BMad skills. Use when the user says 'customize bmad', 'override a skill', 'change agent behavior', or 'customize a workflow'.
- `/bmad-dev-story` — Execute story implementation following a context filled story spec file. Use when the user says "dev this story [story file]" or "implement the next story in the sprint plan"
- `/bmad-document-project` — Document brownfield projects for AI context. Use when the user says "document this project" or "generate project docs"
- `/bmad-domain-research` — Conduct domain and industry research. Use when the user says wants to do domain research for a topic or industry
- `/bmad-edit-prd` — DEPRECATED — consolidated into bmad-prd update intent - this skill will be removed in v7 in favor of `bmad-prd`.
- `/bmad-editorial-review-prose` — Clinical copy-editor that reviews text for communication issues. Use when user says review for prose or improve the prose
- `/bmad-editorial-review-structure` — Structural editor that proposes cuts, reorganization, and simplification while preserving comprehension. Use when user requests structural review or editorial review of structure
- `/bmad-generate-project-context` — Create project-context.md with AI rules. Use when the user says "generate project context" or "create project context"
- `/bmad-help` — Analyzes current state and user query to answer BMad questions or recommend the next skill(s) to use. Use when user asks for help, bmad help, what to do next, or what to start with in BMad.
- `/bmad-index-docs` — Generates or updates an index.md to reference all docs in the folder. Use if user requests to create or update an index of all files in a specific folder
- `/bmad-investigate` — Forensic case investigation with evidence-graded findings, calibrated to the input. Use when the user asks to investigate a bug, trace what caused an incident, walk through unfamiliar code, or build a mental model of a code area before working on it.
- `/bmad-market-research` — Conduct market research on competition and customers. Use when the user says they need market research
- `/bmad-party-mode` — Orchestrates group discussions between installed BMAD agents, enabling natural multi-agent conversations where each agent is a real subagent with independent thinking. Use when user requests party mode, wants multiple agent perspectives, group discussion, roundtable, or multi-agent conversation about their project.
- `/bmad-prd` — Create, update, or validate a PRD. Use when the user wants help producing, editing, or validating a PRD.
- `/bmad-prfaq` — Working Backwards PRFAQ challenge to forge product concepts. Use when the user requests to 'create a PRFAQ', 'work backwards', or 'run the PRFAQ challenge'.
- `/bmad-product-brief` — Create, update, or validate a product brief. Use when the user wants help producing, editing, or validating a brief.
- `/bmad-qa-generate-e2e-tests` — Generate end to end automated tests for existing features. Use when the user says "create qa automated tests for [feature]"
- `/bmad-quick-dev` — Implements any user intent, requirement, story, bug fix or change request by producing clean working code artifacts that follow the project''s existing architecture, patterns and conventions. Use when the user wants to build, fix, tweak, refactor, add or modify any code, component or feature.
- `/bmad-retrospective` — Post-epic review to extract lessons and assess success. Use when the user says "run a retrospective" or "lets retro the epic [epic]"
- `/bmad-review-adversarial-general` — Perform a Cynical Review and produce a findings report. Use when the user requests a critical review of something
- `/bmad-review-edge-case-hunter` — Walk every branching path and boundary condition in content, report only unhandled edge cases. Orthogonal to adversarial review - method-driven not attitude-driven. Use when you need exhaustive edge-case analysis of code, specs, or diffs.
- `/bmad-shard-doc` — Splits large markdown documents into smaller, organized files based on level 2 (default) sections. Use if the user says perform shard document
- `/bmad-spec` — Distill any intent input into the SPEC kernel + companions — the canonical, preservation-validated machine contract for downstream work. Use when the user says "create a spec", "distill this into a spec", "validate this spec", or "update the spec".
- `/bmad-sprint-planning` — Generate sprint status tracking from epics. Use when the user says "run sprint planning" or "generate sprint plan"
- `/bmad-sprint-status` — Summarize sprint status and surface risks. Use when the user says "check sprint status" or "show sprint status"
- `/bmad-technical-research` — Conduct technical research on technologies and architecture. Use when the user says they would like to do or produce a technical research report
- `/bmad-ux` — Plan UX patterns and design specifications. Use when the user says "lets create UX design" or "create UX specifications" or "help me plan the UX
- `/bmad-validate-prd` — DEPRECATED — consolidated into bmad-prd validate intent - this skill will be removed in v7 in favor of `bmad-prd`.

## Configuration

- Config : `_bmad/core/config.yaml`
- Output : `_bmad-output/`
