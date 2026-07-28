# GitHub-to-GitHub Sync Accelerator

One-way code sync from an internal GitHub repository to a customer-owned private repository, using GitHub Actions.

## Repository Structure

```
github-sync/
├── README.md
├── .github/
│   └── workflows/
│       └── sync.yaml
└── setup/
    └── 01-create-ssh-key.sh
```

## Quick Start

### 1. Generate Deploy Key
Run the SSH key generation script to create a dedicated deploy key pair for the one-way sync:
```bash
./setup/01-create-ssh-key.sh
```
Add the printed public key as a **deploy key** with **write access** on the target customer repository.

### 2. Add Secret to Source Repository
Add the generated private key as a GitHub Repository Secret in your source repository:
1. Navigate to **Settings > Secrets and variables > Actions** in the source repository.
2. Click **New repository secret**.
3. Name the secret `SYNC_DEPLOY_KEY`.
4. Paste the contents of the private key (`sync-deploy-key`) into the value field.
5. Save the secret.

Once successfully uploaded, safely delete the local private key:
```bash
rm ./sync-deploy-key
```

### 3. Configure Sync Trigger
Edit the placeholders in `.github/workflows/sync.yaml` to point to your customer repository:
- Replace `<customer-org>/<repo>` with the target GitHub repository namespace.
- Customize `BRANCH_PREFIX` if needed (defaults to `upstream`).

Once configured, push your changes to the configured branch (e.g., `main`) to trigger the sync pipeline. The target repository should receive updates prefixed as `${BRANCH_PREFIX}/<branch-name>`.

## Guardrail Verification
* **Strict One-Way Mirroring:** Ensure no reverse Git remote (i.e., pulling from the customer repository) or dynamic bidirectional merge step is ever added to the sync configs.
* **Asset Protection:** Only push through authorized channels.
