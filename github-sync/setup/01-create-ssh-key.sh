#!/usr/bin/env bash

set -euo pipefail

# Generates a deploy keypair for the one-way sync.
KEY_PATH="${1:-./sync-deploy-key}"

if [[ -f "$KEY_PATH" ]]; then
  echo "==> Key already exists at $KEY_PATH. Skipping generation."
else
  echo "==> Generating deploy keypair..."
  ssh-keygen -t ed25519 -N "" -f "$KEY_PATH" -C "mode1-sync-deploy-key"
fi

echo ""
echo "==> Public key (add as a WRITE deploy key on the CUSTOMER repo):"
cat "${KEY_PATH}.pub"
echo ""
echo "==> Private key path (do NOT commit): ${KEY_PATH}"
