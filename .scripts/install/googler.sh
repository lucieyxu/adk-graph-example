#!/bin/bash

where_result=$(type -a gcert 2>&1)

if [[ "$where_result" == *"not found"* ]]; then
    Echo "Not a corp device. Skipping googler auth..."
    exit 0
fi

gcertstatus --check_remaining=4h --quiet || gcert --quiet

# WRITE token to ~/.npmrc
gpkg setup > /dev/null

# ALSO write token to bunfig.toml, since this is problematic on linux
TOKEN=$(awk -F'_authToken=' 'NF>1 {print $2; exit}' ~/.npmrc)
echo "[install]
registry = { url = \"https://us-npm.pkg.dev/artifact-foundry-prod/npm-3p-trusted/\", token = \"$TOKEN\" }" > bunfig.toml