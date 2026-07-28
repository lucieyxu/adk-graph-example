#!/bin/bash

# ENSURE we are at the repo root
cd "$(dirname "$0")"
cd ../..

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - GET user input
# 

echo "Google Cloud Demos: Terraformer | Unpopulate"
echo "Warning: You are running the unpopulate-template script. This will reset all GCP project id, project name, etc references within files, filenames, and directories to their cooresponding placeholder values."
read -p "1. Enter the GCP project ID (Must start with gcdemos...): " GCP_PROJECT_ID
read -p "2. Enter the project name (e.g. \"My Awesome Demo\"):" PROJECT_NAME
read -p "3. Enter the Google Analytics Tag ID (e.g. \"G-ABCDE12345\"):" NEXT_PUBLIC_GA_TAG_ID
GCP_PROJECT_ID_UNDERSCORES=$( echo "$GCP_PROJECT_ID" | sed "s/-/_/g" )
GCP_PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format="value(projectNumber)")

# CONFIRM user input is correct
echo "- - - - -"
echo "You entered:"
echo "GCP Project ID: $GCP_PROJECT_ID"
echo "GCP Project Number: $GCP_PROJECT_NUMBER"
echo "Project Name: $PROJECT_NAME"
echo "Google Analytics Tag ID: $NEXT_PUBLIC_GA_TAG_ID"
echo "- - - - -"
while true; do
    read -p "Review the above information, and confirm that you want to proceed with a find/replace across the whole repo (Y/n):" yn
    case $yn in 
        [yY] ) echo "Proceeding with find and replace operation...";
            break;;
        [nN] ) echo Exiting...;
            exit;;
        * ) echo invalid response;;
    esac
done

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - FIND and replace across repo
# 

LANG=C
LC_CTYPE=C

# ERASE firestore config
echo "{
    \"projectId\": \"\",
    \"appId\": \"\",
    \"databaseURL\": \"\",
    \"storageBucket\": \"\",
    \"apiKey\": \"\",
    \"authDomain\": \"\",
    \"messagingSenderId\": \"\"
}" > shared/config/firebase-config.json


# Substitute placeholders in folder names
find . -type d -depth \
    -not -path "*/.venv/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/__pycache__/*" \
    -not -path "*/dist/*" \
    -not -path "*/.git/*" \
    -not -path "*/.next/*" \
    -not -path "*/.github/*" \
    -print0 | while IFS= read -r -d $'\0' old_path; do

    new_path=$(
        echo "$old_path" |
        sed \
            -e "s/$GCP_PROJECT_ID/__GCP_PROJECT_ID__/g" \
            -e "s/$GCP_PROJECT_ID_UNDERSCORES/__GCP_PROJECT_ID_UNDERSCORES__/g" \
            -e "s/$GCP_PROJECT_NUMBER/__GCP_PROJECT_NUMBER__/g" \
            -e "s/$PROJECT_NAME/__PROJECT_NAME__/g" \
            -e "s/$NEXT_PUBLIC_GA_TAG_ID/__NEXT_PUBLIC_GA_TAG_ID__/g"
    )
    if [ "$old_path" != "$new_path" ]; then
        mkdir -p "$new_path/"
        mv "$old_path/*" "$old_path/.[!.]*" "$new_path" >/dev/null 2>&1
    fi

done

# Substitute placeholders in file names
find . -type f -depth \
    -not -path "*/.venv/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/__pycache__/*" \
    -not -path "*/dist/*" \
    -not -path "*/.git/*" \
    -not -path "*/.next/*" \
    -not -path "*/.github/*" \
    -print0 | while IFS= read -r -d $'\0' old_path; do

    new_path=$(
        echo "$old_path" |
        sed \
            -e "s/$GCP_PROJECT_ID/__GCP_PROJECT_ID__/g" \
            -e "s/$GCP_PROJECT_ID_UNDERSCORES/__GCP_PROJECT_ID_UNDERSCORES__/g" \
            -e "s/$GCP_PROJECT_NUMBER/__GCP_PROJECT_NUMBER__/g" \
            -e "s/$PROJECT_NAME/__PROJECT_NAME__/g" \
            -e "s/$NEXT_PUBLIC_GA_TAG_ID/__NEXT_PUBLIC_GA_TAG_ID__/g"
    )
    if [ "$old_path" != "$new_path" ]; then
        mv "$old_path" "$new_path"
    fi

done

# Substitute placeholders in file contents
ignored_extensions=("png" "svg" "jpg" "jpeg" "woff" "woff2" "ico" "bat" "DS_Store")
find . -type f \
    -not -path "*/.venv/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/__pycache__/*" \
    -not -path "*/dist/*" \
    -not -path "*/.git/*" \
    -not -path "*/.next/*" \
    -not -path "*/.github/*" \
    -not -path "*/terraform/populate.sh" \
    -not -path "*/terraform/unpopulate.sh" \
    -print0 | while IFS= read -r -d $'\0' file; do

    extension="${file##*.}"
    if [[ "$file" == *.* && ! " ${ignored_extensions[@]} " =~ " ${extension} " ]]; then
        sed -i "" \
            -e "s/$GCP_PROJECT_ID/__GCP_PROJECT_ID__/g" \
            -e "s/$GCP_PROJECT_ID_UNDERSCORES/__GCP_PROJECT_ID_UNDERSCORES__/g" \
            -e "s/$GCP_PROJECT_NUMBER/__GCP_PROJECT_NUMBER__/g" \
            -e "s/$PROJECT_NAME/__PROJECT_NAME__/g" \
            -e "s/$NEXT_PUBLIC_GA_TAG_ID/__NEXT_PUBLIC_GA_TAG_ID__/g" \
            "$file"
    fi
done

sed -i ""\
    -e "s/CLOUDSDK_CORE_PROJECT/__UNSET_CLOUDSDK_CORE_PROJECT__/g" \
    "./mise.toml"

find . -type d -empty -delete

echo "Completed untemplating process."