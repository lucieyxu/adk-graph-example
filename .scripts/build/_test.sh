#!/bin/bash

###
###
### START test only code
### DO not include in cloudbuild.yaml
cd "$(dirname "$0")"
cd ../..
TEST="true"
echo "Running build process in test mode"
GCP_PROJECT_ID=$(gcloud config get-value project)
REPO_NAME="$GCP_PROJECT_ID"
# BRANCH_NAME=$(git branch --show-current)
BRANCH_NAME=staging
COMMIT_SHA=$(git rev-parse HEAD)
### END test only code
###
###


#!/bin/bash

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Helper Functions
# 

join_by() { local IFS="$1"; shift; echo "$*"; }

parse_deployed_commit() {
    app_infos="$1"
    start_string="$2"
    end_string="$3"

    deployed_sha="${workflow_infos#*$start_string}"
    deployed_sha="${deployed_sha%%$end_string*}"
    deployed_sha=$(echo "$deployed_sha" | xargs)

    echo "$deployed_sha"
}

normalize_app_path() {
    local str="$1"
    norm_str="${str}"
    norm_str="${norm_str%/}"
    norm_str="${norm_str#./}"
    echo "$norm_str"
}

find_file_in_dir() {
    local file_to_find="$1"
    local dir_to_search="$2"

    # WALK directory and return all files with matching name within subdirectory, 
    # skipping node_modules
    local found_files=()
    while read -d $'\0' file; do
    if [[ -f $file && "$file" == $dir_to_search/* ]]; then
        found_files+=("$file")
    fi
    done < <(find . -name "node_modules" -prune -o -name "$file_to_find" -print0)

    for item in "${found_files[@]}"; do
        echo "$item"
    done
}

test_git_change_in_app_dir() {
    # Given two commit sha hash id's, for the current commit and the previously deployed service, 
    # and the directory of the app in the repo, determine if the app needs to be rebuilt, i.e.
    # relevant files have changed

    local current_sha="$1"
    local deploy_sha="$2"
    local app_dir="$3"

    local needs_build="false"

    if [[ -z "${deploy_sha}" ]] || [[ -z "${current_sha}" ]]; then
        
        # SKIP test if no previous deploy was found
        needs_build="true"

    else
        
        # QUERY changed files via git
        git_diff_str=$(git diff --name-only "$deploy_sha" "$current_sha" 2>&1)
        
        # CATCH non-deployed
        if [[ $git_diff_str == "fatal:"* ]] ; then
            needs_build="true"
            git_diff_str=''
        fi

        # SPLIT string of changed filepaths into array
        git_diff=()
        for i in $git_diff_str; do git_diff+=('./'$i) ; done

        # TEST if we need to build
        for f in ${git_diff[@]};
        do
            # TEST if each changed file is in the app directory
            app_dir_rel="./$app_dir"
            if [[ $f == "$app_dir_rel"* ]]; then
                # ...and is not a README.md file
                if ! [[ $f == *"README.md"* ]]; then
                    needs_build="true"
                fi
            fi

            # TEST if each changed file is in the list of top level files/folders
            for g in "${top_level_files_that_trigger_rebuilds[@]}"; do
                if [[ "$f" == "$g" ]] || [[ "$f" == "$g"* ]]; then
                    needs_build="true"
                fi
            done
        done
    fi

    echo "$needs_build"
}


default_function_config=(
    "_TASKS=1"
    "_PARALLELISM=1"
    "_TASK_TIMEOUT=3600"
    "_RETRIES=3"
    "_MEMORY_LIMIT=512Mi"
    "_CPU_COUNT=1"
    "_GPU_COUNT="
    "_GPU_TYPE="
)

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Global
# 

GCP_PROJECT_ID=$(gcloud config get-value project)
BUILD_SERVICE_ACCOUNT="projects/$GCP_PROJECT_ID/serviceAccounts/cloud-build@$GCP_PROJECT_ID.iam.gserviceaccount.com"
APP_SERVICE_ACCOUNT="default-service-account@$GCP_PROJECT_ID.iam.gserviceaccount.com"

top_level_files_that_trigger_rebuilds=(
    "./.scripts/build"
    "./cloudbuild.yaml"
    "./biome.json"
    "./package.json"
    "./bun.lock"
    "./mise.toml"
    "./shared"
)

# CONVERT url map to array of strings for use in env vars and substitutions (notably for Jobs)
ALL_URLS_JSON_FILE="./shared/config/urls.json"
url_array=()
while IFS= read -r line; do
    url_array+=("$line")
done < <( \
    awk -v env="$BRANCH_NAME" '
        # Use a range pattern to match lines between the environment key and the closing brace.
        $0 ~ "\"" env "\": {", /}/ {
            # Exclude the start and end lines of the range from being processed.
            if ($0 !~ "\"" env "\": {" && $0 !~ /}/) {
                # Remove leading whitespace
                sub(/^[ \t]+/, "");
                # Remove first quote
                sub(/"/, "");
                # Replace quote-colon-space-quote (or quote-colon-quote) with equals
                sub(/": "/, "=");
                sub(/":"/, "=");
                # Remove the trailing quote and optional comma
                sub(/",?$/, "");
                print;
            }
        }
    ALL_URLS_' "$ALL_URLS_JSON_FILE" \
)
ENV_URLS_CONCAT=$(IFS=","; echo "${url_array[*]}")

pids=()
overall_status=0

# 
# - - - Workflows
# 

apps_found=()
apps_dir="./workflows"
app_filename="workflow.yaml"
app_type="Workflow" 
while IFS= read -r line; do apps_found+=("$line"); done < <(find_file_in_dir "$app_filename" "$apps_dir")

# Loop through the array by index to show each element
for file in "${apps_found[@]}"; do

    echo '- - - - - - -'
    echo Found $app_type: $file

    # PARSE app name
    app_path=$(normalize_app_path "${file/workflow.yaml/}")
    app_name=$(echo "$app_path" | sed 's/\//-/g')
    env_app_name="${BRANCH_NAME}-${app_name}"

    # EXTRACT previous deploy commit SHA id
    app_infos=$(gcloud workflows describe ${env_app_name} --location=us-central1)
    deployed_sha=$(parse_deployed_commit "$app_infos" "commit-sha: " "\n")

    # CHECK for changed files
    needs_build=$(test_git_change_in_app_dir "$COMMIT_SHA" "$deployed_sha" "$app_path")
    
    if [[ "$needs_build" == "true" ]]; then
        echo Building $env_app_name
        if [[ "$TEST" == "true" ]]; then
            echo Skipping actual build in test mode.
        else
            # DELETE all previous revisions (any currently serving traffic will fail to delete)
            gcloud workflows delete "$env_app_name" --location=us-central1 --quiet || true

            # SPAWN new build
            (   
                gcloud builds submit ./ \
                    --config=.scripts/build/workflow.yaml \
                    --region=us-central1 \
                    --service-account=$BUILD_SERVICE_ACCOUNT \
                    --substitutions="^;^REPO_NAME=$REPO_NAME;BRANCH_NAME=$BRANCH_NAME;TAG_NAME=$TAG_NAME;REVISION_ID=$REVISION_ID;COMMIT_SHA=$COMMIT_SHA;SHORT_SHA=$SHORT_SHA;_WORKFLOW_NAME=${app_name};_WORKFLOW_PATH=${app_path}/${app_filename};_APP_SERVICE_ACCOUNT=${APP_SERVICE_ACCOUNT};_ENV_URLS=${ENV_URLS_CONCAT}"
            ) &
            pids+=($!)
        fi
    else
        echo No change, skipping build for $env_app_name
    fi

done

# 
# - - - Cloud Run Jobs
# 

default_config=(
    "_TASKS=1"
    "_PARALLELISM=1"
    "_TASK_TIMEOUT=3600"
    "_RETRIES=3"
    "_MEMORY_LIMIT=512Mi"
    "_CPU_COUNT=1"
    "_GPU_COUNT="
    "_GPU_TYPE="
)

apps_found=()
apps_dir="./jobs"
app_filename="cloudrun.dockerfile"
app_config_filename="cloudrun.config"
app_type="Job" 
while IFS= read -r line; do apps_found+=("$line"); done < <(find_file_in_dir "$app_filename" "$apps_dir")

# Loop through the array by index to show each element
for file in "${apps_found[@]}"; do

    echo '- - - - - - -'
    echo Found $app_type: $file

    # PARSE app name
    app_path=$(normalize_app_path "${file/cloudrun.dockerfile/}")
    app_config_path="$app_path/$app_config_filename"
    app_name=$(echo "$app_path" | sed 's/\//-/g' )
    env_app_name="${BRANCH_NAME}-${app_name}"

    # EXTRACT previous deploy commit SHA id
    app_infos=$(gcloud run jobs describe ${env_app_name} --region=us-central1)
    deployed_sha=$(parse_deployed_commit "$app_infos" "commit-sha:" " ")

    # CHECK for changed files
    needs_build=$(test_git_change_in_app_dir "$COMMIT_SHA" "$deployed_sha" "$app_path")

    if [[ "$needs_build" == "true" ]]; then
        echo Building $env_app_name

        # READ local config file, make substitutions in build generic cloudbuild-job.yaml
        config=()
        if [ ! -f $app_config_path ]; then
            echo "WARNING for $env_app_name -- No local config found, using defaults"
            config=("${default_config[@]}")
        else
            IFS=$'\n' read -d '' -r -a config < $app_config_path
        fi
        local_substitutions=$(join_by ";" ${config[@]} )

        if [[ "$TEST" == "true" ]]; then
            echo Skipping actual build in test mode.
        else
            # DELETE all previous revisions
            gcloud run jobs delete "$env_app_name" --region=us-central1 --quiet || true

            # SPAWN new build 
            (   
                gcloud builds submit ./ \
                    --config=.scripts/build/cloudrun-job.yaml \
                    --region=us-central1 \
                    --service-account=$BUILD_SERVICE_ACCOUNT \
                    --substitutions="^;^REPO_NAME=$REPO_NAME;BRANCH_NAME=$BRANCH_NAME;TAG_NAME=$TAG_NAME;REVISION_ID=$REVISION_ID;COMMIT_SHA=$COMMIT_SHA;SHORT_SHA=$SHORT_SHA;_JOB_NAME=${app_name};_DOCKER_PATH=${app_path};${local_substitutions}"
            ) &
            pids+=($!)
        fi
    else
        echo No change, skipping build for $env_app_name
    fi
    
done

# 
# - - - Cloud Run Services
# 

default_config=(
    "_SCALING=auto"
    "_MIN_INSTANCES=0"
    "_MAX_INSTANCES=10"
    "_HTTP_TIMEOUT=30"
    "_MEMORY_LIMIT=512Mi"
    "_CPU_COUNT=1"
    "_GPU_COUNT=0"
    "_GPU_TYPE="
    "_CONCURRENCY=1000"
    "_INGRESS=all"
    "_LIVENESS_PROBE=\"\""
)

apps_found=()
apps_dir="./services"
app_filename="cloudrun.dockerfile"
app_config_filename="cloudrun.config"
app_type="Service" 
while IFS= read -r line; do apps_found+=("$line"); done < <(find_file_in_dir "$app_filename" "$apps_dir")

# Loop through the array by index to show each element
for file in "${apps_found[@]}"; do

    echo '- - - - - - -'
    echo Found $app_type: $file

    # PARSE app name
    app_path=$(normalize_app_path "${file/cloudrun.dockerfile/}")
    app_config_path="$app_path/$app_config_filename"
    app_name=$(echo "$app_path" | sed 's/\//-/g' )
    env_app_name="${BRANCH_NAME}-${app_name}"

    # EXTRACT previous deploy commit SHA id
    app_infos=$(gcloud run services describe ${env_app_name} --region=us-central1)
    deployed_sha=$(parse_deployed_commit "$app_infos" "commit-sha:" " ")

    # CHECK for changed files
    needs_build=$(test_git_change_in_app_dir "$COMMIT_SHA" "$deployed_sha" "$app_path")

    if [[ "$needs_build" == "true" ]]; then
        echo Building $env_app_name

        # READ local config file, make substitutions in build generic cloudbuild-job.yaml
        config=()
        if [ ! -f $app_config_path ]; then
            echo "WARNING for $env_app_name -- No local config found, using defaults"
            config=("${default_config[@]}")
        else
            IFS=$'\n' read -d '' -r -a config < $app_config_path
        fi
        local_substitutions=$(join_by ";" ${config[@]} )

        if [[ "$TEST" == "true" ]]; then
            echo Skipping actual build in test mode.
        else
            # DELETE all previous revisions
            PREVIOUS_REVISIONS=$(gcloud run revisions list --service="$env_app_name" --region="us-central1" --format="value(metadata.name)")
            if [ -z "$PREVIOUS_REVISIONS" ]; then
                echo "No revisions to delete"
            else
            for REVISION in $PREVIOUS_REVISIONS; do
                echo "Deleting revision: $REVISION..."
                gcloud run revisions delete "$REVISION" --region="us-central1" --quiet  || true
            done
            fi

            # SPAWN new build 
            (   
                gcloud builds submit ./ \
                    --config=.scripts/build/cloudrun-service.yaml \
                    --region=us-central1 \
                    --service-account=$BUILD_SERVICE_ACCOUNT \
                    --substitutions="^;^REPO_NAME=$REPO_NAME;BRANCH_NAME=$BRANCH_NAME;TAG_NAME=$TAG_NAME;REVISION_ID=$REVISION_ID;COMMIT_SHA=$COMMIT_SHA;SHORT_SHA=$SHORT_SHA;_SERVICE_NAME=${app_name};_DOCKER_PATH=${app_path};${local_substitutions}"
            ) &
            pids+=($!)
        fi
    else
        echo No change, skipping build for $env_app_name
    fi
    
done

# 
# - - - App Engine
# 

apps_found=()
apps_dir="./appengine"
app_filename="app.yaml"
app_type="AppEngine" 
while IFS= read -r line; do apps_found+=("$line"); done < <(find_file_in_dir "$app_filename" "$apps_dir")

# Loop through the array by index to show each element
for file in "${apps_found[@]}"; do

    echo '- - - - - - -'
    echo Found $app_type: $file

    # PARSE app name
    app_yaml_path="$file"
    app_path=$(normalize_app_path "${file/app.yaml/}")
    app_name=$(echo "$app_path" | sed 's/\//-/g' )
    env_app_name="${BRANCH_NAME}-${app_name}"

    # RENAME default app so URL is shorter
    if [[ "$env_app_name" == "prod-appengine-default" ]]; then
        env_app_name="default"
    fi
    if [[ "$env_app_name" == "staging-appengine-default" ]]; then
        env_app_name="staging"
    fi
    if [[ "$env_app_name" == "prod-appengine-public" ]]; then
        env_app_name="public"
    fi
    if [[ "$env_app_name" == "staging-appengine-public" ]]; then
        env_app_name="staging-public"
    fi

    # EXTRACT previous deploy commit SHA id
    app_infos=$(gcloud app versions list --service="$env_app_name" --sort-by="~version.createTime" --format='value(id)' --limit=1)
    deployed_sha=$(echo $app_infos | sed "s/$env_app_name-//")

    # CHECK for changed files
    needs_build=$(test_git_change_in_app_dir "$COMMIT_SHA" "$deployed_sha" "$app_path")

    if [[ "$needs_build" == "true" ]]; then
        echo Building $env_app_name

        if [[ "$TEST" == "true" ]]; then
            echo Skipping actual build in test mode.
        else
            # NOTE: previous revisions are deleted after deployment,
            # via the script in .scripts/build/appengine.yaml

            # SPAWN new build 
            (
                gcloud builds submit ./ \
                    --config=".scripts/build/appengine.yaml" \
                    --region="us-central1" \
                    --service-account="$BUILD_SERVICE_ACCOUNT" \
                    --substitutions REPO_NAME=$REPO_NAME,BRANCH_NAME=$BRANCH_NAME,COMMIT_SHA=$COMMIT_SHA,_APP_DIR=$app_path,_SERVICE_NAME=$env_app_name,_APP_SERVICE_ACCOUNT=$APP_SERVICE_ACCOUNT,_APP_YAML_PATH=$app_yaml_path
            ) &
            pids+=($!)
        fi
    else
        echo No change, skipping build for $env_app_name
    fi
    
done

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Global
# 

# WAIT for all builds, and capture their exit codes
for pid in ${pids[*]}; do
    wait $pid
    status=$?
    if [ $status -ne 0 ]; then
        overall_status=1
    fi
done

echo '- - - - - - -'

# FAIL if any builds failed
if [ $overall_status -eq 0 ]; then
    echo "All builds completed successfully"
    exit 0
else
    echo "At least one build failed."
    exit 1
fi