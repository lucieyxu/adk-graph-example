#!/bin/bash

cd "$(dirname "$0")"
cd ../..

find_file() {
    local file_to_find="$1"
    local dir_to_search="$2"

    # WALK directory and return all files with matching name
    # skipping node_modules
    local found_files=()
    while read -d $'\0' file; do
    if [[ -f $file ]]; then
        found_files+=("$file")
    fi
    done < <(find . -name "node_modules" -prune -o -name "$file_to_find" -print0)

    for item in "${found_files[@]}"; do
        echo "$item"
    done
}

tomls_found=()
while IFS= read -r line; do tomls_found+=("$line"); done < <(find_file "mise.toml")

for file in "${tomls_found[@]}"; do
    norm_str="${file}"
    norm_str="${norm_str%/}"
    norm_str="${norm_str#./}"
    mise trust "$norm_str"
done