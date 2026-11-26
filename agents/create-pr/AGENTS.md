# Create PR capability

This unit owns the issue-to-PR workflow in `SKILL.md`. It applies to requests to prepare or execute that workflow, not ordinary implementation work or edits to its templates.

Inputs are the requirement, target repository, and any existing issue or PR. Outputs are a documented issue, an issue-named branch, scoped commits, and a linked PR, limited to the actions the user authorizes.

Use Git and an available GitHub connector or authenticated `gh` CLI for execution. Local Markdown edits need no additional dependencies. Without GitHub access, prepare the issue or PR text locally and report the blocked step; never fabricate issue numbers or URLs.

Validate skill metadata with the `skill-creator` validator when available, inspect template links, and run `git diff --check`. Review the sequence against a new requirement, an existing issue, a failed issue creation, and an explicit request to remain on `main`. No runtime tests are required for instruction-only changes.
