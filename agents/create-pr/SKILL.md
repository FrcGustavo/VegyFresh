---
name: create-pr
description: Prepare or execute the requirement-to-issue, branch, commits, and linked PR workflow in VegyFresh. Use when asked to plan, create, or document a PR.
---

# Create a PR

Read the applicable repository and unit instructions. Perform only actions authorized by the user; this skill does not grant permission to publish, commit, or modify GitHub. When the user has already authorized the full workflow, proceed without repeated confirmation requests.

Write issue titles and bodies, branch names, commit messages, and PR content in English.

## 1. Document the requirement in an issue

Use the [requirement template](../../.github/ISSUE_TEMPLATE/requirement.md): describe the problem, expected outcome, scope, and verifiable acceptance criteria before creating the branch or implementing changes.

If the user provided an existing issue, read and reuse it when it matches the requirement. Do not create duplicates. Confirm the target repository through its remotes and record the actual number and URL of the created or existing issue.

Ask for missing information that prevents defining the expected outcome. If issue creation fails or GitHub access is unavailable, preserve the prepared text and report the blocker before proceeding with steps that depend on its number. After an ambiguous creation response, look for the issue before retrying to avoid duplicates.

## 2. Create the branch

Include the primary GitHub issue number in the branch name, following the [PR template](../../.github/pull_request_template.md). For issue `123`, examples include `feature/issue-123-add-catalog-filters` and `fix/issue-123-correct-order-totals`.

Check the PR base branch and local state before creating the branch in the current checkout. If a branch already exists for that issue, verify its purpose before reusing it. Do not use worktrees unless explicitly requested by the user.

An explicit instruction to work on `main` or keep the current branch overrides this step: do not create or switch branches. Do not open a PR from `main` into itself; prepare its documentation and explain the pending step if the user also requested a PR.

## 3. Implement, validate, and commit

Implement the scope and verify the issue's acceptance criteria. Run the checks required by each affected unit before considering the work complete.

When commits are authorized, group changes by responsibility and follow the repository's Git conventions. Inspect the diff and stage only files belonging to the requirement. Preserve unrelated changes.

When the user specifies a per-PR file limit, count the changed files against each PR's actual base before publishing. Split by responsibility and record the base and merge order for dependent PRs.

## 4. Create and document the PR

After committing, and with authorization to publish, push the branch to the target remote and create the PR against the verified base. Reuse an existing PR for that branch instead of creating a duplicate. After an ambiguous response, check whether the PR exists before retrying.

Complete the [PR template](../../.github/pull_request_template.md):

- **Summary.** Use one to three bullets to explain the resulting behavior and scope.
- **Issue linkage.** Use exactly one reference with the actual issue number. Use `Refs #123` for partial work and `Closes #123` for the PR that completes the issue. For a cross-repository reference, use `owner/repo#123`. Automatic closure depends on merging the PR into the default branch.
- **Validation.** Include prerequisites, reproducible steps, and expected results. Distinguish completed checks from pending checks and explain blockers.

Verify the destination, branch, diff, issue reference, and published body. Return the issue and PR links and a validation summary. Do not merge the PR or manually close the issue as part of this workflow.
