#!/bin/bash

while true; do
    read -p "Are you sure you want to permanently delete all local branches? [y/N] " yn
    case $yn in
        [Yy]* ) echo "Deleting local branches..."; break;;
        [Nn]* ) echo "Aborting."; exit;;
        * ) echo "Please answer yes or no.";;
    esac
done

git branch | grep -v staging | grep -v prod | xargs -n 1 git branch -D --quiet && git fetch --prune

echo "Done."