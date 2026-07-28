#!/bin/bash

# ENSURE we are at the repo root
cd "$(dirname "$0")"
cd ../..

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - GET user input
# 

echo "Google Cloud Demos: Terraformer | Populate"
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

CLOUDSDK_CORE_PROJECT="$GCP_PROJECT_ID"

yes | gcloud config set project "$GCP_PROJECT_ID"


# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - FIND and replace across repo
# 

LANG=C
LC_CTYPE=C

echo "Starting templating process..."

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
            -e "s/__GCP_PROJECT_ID__/$GCP_PROJECT_ID/g" \
            -e "s/__GCP_PROJECT_ID_UNDERSCORES__/$GCP_PROJECT_ID_UNDERSCORES/g" \
            -e "s/__GCP_PROJECT_NUMBER__/$GCP_PROJECT_NUMBER/g" \
            -e "s/__PROJECT_NAME__/$PROJECT_NAME/g" \
            -e "s/__NEXT_PUBLIC_GA_TAG_ID__/$NEXT_PUBLIC_GA_TAG_ID/g"
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
            -e "s/__GCP_PROJECT_ID__/$GCP_PROJECT_ID/g" \
            -e "s/__GCP_PROJECT_ID_UNDERSCORES__/$GCP_PROJECT_ID_UNDERSCORES/g" \
            -e "s/__GCP_PROJECT_NUMBER__/$GCP_PROJECT_NUMBER/g" \
            -e "s/__PROJECT_NAME__/$PROJECT_NAME/g" \
            -e "s/__NEXT_PUBLIC_GA_TAG_ID__/$NEXT_PUBLIC_GA_TAG_ID/g"
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
        sed -i ""\
            -e "s/__GCP_PROJECT_ID__/$GCP_PROJECT_ID/g" \
            -e "s/__GCP_PROJECT_ID_UNDERSCORES__/$GCP_PROJECT_ID_UNDERSCORES/g" \
            -e "s/__GCP_PROJECT_NUMBER__/$GCP_PROJECT_NUMBER/g" \
            -e "s/__PROJECT_NAME__/$PROJECT_NAME/g" \
            -e "s/__NEXT_PUBLIC_GA_TAG_ID__/$NEXT_PUBLIC_GA_TAG_ID/g" \
            "$file"
    fi
done

sed -i ""\
    -e "s/__UNSET_CLOUDSDK_CORE_PROJECT__/CLOUDSDK_CORE_PROJECT/g" \
    "./mise.toml"

find . -type d -empty -delete

echo "Completed templating process."

# PUSH to prod branch
git add -A
git commit -m "populate template"
git push

echo "An initial prod build has been triggered..."

echo "Open the following URL:
- - - -
https://console.cloud.google.com/cloud-build/builds;region=us-central1?project=$GCP_PROJECT_ID
- - - -"

read -p "Once the prod build has completed, press enter to continue..."

# RE-TRIGGER build, since we need the default service to exist before we can deploy alternates
gcloud builds triggers run prod \
    --region="us-central1" \
    --project="$GCP_PROJECT_ID" \
    --branch="prod" \
    --no-user-output-enabled

echo "A second prod build has been triggered, to deploy all non-default services as well"

# CREATE and push to staging branch
echo "Creating a staging branch..."

git checkout -b staging
git push

echo "A staging build has been triggered..."

echo "To finalize the IAP security setup, open the following URL:
- - - 
https://console.cloud.google.com/security/iap?project=$GCP_PROJECT_ID
- - - 
1. Refresh the page until the "default" service appears in AppEngine list of apps
2. Select the top level 'AppEngine app'
3. Click the three vertical dots icon in this row, then click 'Settings'
4. Under 'Oauth configuration', select 'Custom OAuth'
5. Click 'Auto Generate Credentials'
6. Scroll down, and click 'Save'
7. Refresh until all other services appear in the list. You should see 'default', 'public', 'staging', and 'staging-public'
8. Use the checkboxes on the left to select both the public and the staging-public services
9. In the panel that appears on the right, click "Add principal"
10. Type 'allUsers' into the New principals field
11. Click the 'Select a role' input, type 'web', then click 'IAP-secured Web App User'
12. Click 'Save', and then click 'Allow Public Access' in the modal that appears.
"

read -p "Once you have done so, press enter to continue..."

echo "If you need GPU allocations for Cloud Run Jobs, go to the following URL and :
- - - 
https://pantheon.corp.google.com/iam-admin/quotas?project=$GCP_PROJECT_ID
- - - 
1. Add to filters in the search bar
 - region:us-central1
 - Metric:run.googleapis.com/nvidia_l4_gpu_allocation_no_zonal_redundancy
2. Click on the row that appears, and then click the three dots on the right side, and "Edit Quota"
3. Fill out and submit a request for a quota increase. Typically, you will need 1-4 GPUs, in burst.
"

read -p "Once you have done so or determined that you do not need to, press enter to continue..."

echo "
- - - -
- - - -
- - - -
- - - -

Completed Repo Population + GCP Deployment operations!

- - - -
- - - -
- - - -
- - - -"
