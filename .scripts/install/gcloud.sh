#!/bin/bash

echo "Checking for gcloud SDK"

where_result=$(type -a gcloud 2>&1)

if [[ "$where_result" == *"not found"* ]]; then
    echo "Did not find gcloud -- installing!"
    curl https://sdk.cloud.google.com | bash
    exec -l $SHELL
    gcloud init
    gcloud components update
else
    echo "Found gcloud installation"
fi