# Shared TendUI project board

The GitHub connector used for preparation cannot create Projects. The issues
below already exist; this file describes the owner setup still needed, not a
claim that a board is active.

Create an organization-level **TendUI** project at
https://github.com/orgs/Tend-Stack/projects using the Board layout. It should
track both `Tend-Stack/TendUI` and `Tend-Stack/TendUI-web`.

## Fields and views

- Status columns: Backlog, Ready, In progress, In review, Done.
- Priority: High, Normal, Low. Reserve High for reproducible defects, security
  coordination and launch blockers; do not disclose private vulnerabilities.
- Use GitHub's Repository, Labels, Assignees and linked PR fields.
- Views: All work (board), Bugs (filter label:bug), Ready for contribution
  (filter label:"help wanted"), and Launch (the launch checklist and linked tasks).
- Set public visibility only after repository publication/privacy review. A
  public project does not make private repository issues public automatically.

## Seed issues

- https://github.com/Tend-Stack/TendUI/issues/3 — launch and protections; High, In progress.
- https://github.com/Tend-Stack/TendUI/issues/4 — manual accessibility review; Normal, Ready.
- https://github.com/Tend-Stack/TendUI/issues/5 — html/template recipe; Normal, Ready, good first issue.
- https://github.com/Tend-Stack/TendUI-web/issues/3 — visual baselines; Normal, Backlog.

Link the current preview PRs as In review. Add the board URL to each repository's
About/Projects area and CONTRIBUTING.md once the board exists.

## Automation and triage

Enable built-in workflows that mark closed issues and merged PRs Done. Configure
auto-add for open issues/PRs from both repositories if the organization plan
supports the required workflows. Otherwise add items during weekly triage.

Keep untriaged reports in Backlog. Move a task to Ready only when it has a clear
scope and acceptance criteria. Assign one owner when work starts; move to In
review when a PR is ready. Closing a PR without merging does not necessarily
resolve its linked issue. Use a bounded archive of completed items rather than
deleting issue history.

Check duplicates before creating issues. Maintain real bugs as issues with
reproduction steps; never use the public board to track confidential security
reports or private infrastructure identifiers.
