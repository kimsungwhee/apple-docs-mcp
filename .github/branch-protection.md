# Branch Protection Rules

## Setup Instructions

To protect the `main` branch, configure the following rules in GitHub:

### 1. Go to Settings → Branches

### 2. Add branch protection rule for `main`

**Required status checks:**
- [x] CI / Test (18.x)
- [x] CI / Test (20.x)
- [x] CI / Build
- [x] CI / Type Check
- [x] PR Check / PR Validation

**Protection settings:**
- [x] Require a pull request before merging
  - [x] Require approvals (1)
  - [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
- [x] Require conversation resolution before merging
- [x] Do not allow bypassing the above settings

### 3. Additional Settings (Optional)

**Code quality:**
- [x] Require linear history
- [x] Include administrators
- [x] Restrict who can push to matching branches

## Required Secrets

Add these secrets in Settings → Secrets and variables → Actions:

1. **NPM_TOKEN**: Your npm authentication token for publishing
   - Get it from: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create a token with "Automation" type

## Workflow Status Badges

Add these badges to your README.md:

```markdown
[![CI](https://github.com/kimsungwhee/apple-docs-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/kimsungwhee/apple-docs-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp.svg)](https://www.npmjs.com/package/@kimsungwhee/apple-docs-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```