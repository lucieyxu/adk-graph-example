#!/bin/bash

# ENSURE we are at the repo root
cd "$(dirname "$0")"
cd ../..

ENVS=( 
    "dev"
    "staging"
    "prod"
)

DEPLOYED_ENVS=( 
    "staging"
    "prod"
)

GCP_PROJECT_ID="__GCP_PROJECT_ID__"
GCP_PROJECT_NUMBER="__GCP_PROJECT_NUMBER__"
PROJECT_NAME="__PROJECT_NAME__"
GCP_PROJECT_ID_UNDERSCORES=$( echo "$GCP_PROJECT_ID" | sed "s/-/_/g" )
NEXT_PUBLIC_GA_TAG_ID="__NEXT_PUBLIC_GA_TAG_ID__"

CLOUD_BUILD_SERVICE_ACCOUNT_ID="cloud-build"
CB_SA_FULL="$CLOUD_BUILD_SERVICE_ACCOUNT_ID@$GCP_PROJECT_ID.iam.gserviceaccount.com"
DEFAULT_SERVICE_ACCOUNT_ID="default-service-account"
D_SA_FULL="$DEFAULT_SERVICE_ACCOUNT_ID@$GCP_PROJECT_ID.iam.gserviceaccount.com"

CLOUDSDK_CORE_PROJECT="$GCP_PROJECT_ID"

yes | gcloud config set project "$GCP_PROJECT_ID"


# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - START active test area
# 


echo "Starting Cloud Storage operations..."

# 
# TODO in your demo (not this template): add withgoogle.com domain to the bucket CORS
# 

echo "[
  {
    \"origin\": [
      \"https://staging-dot-$GCP_PROJECT_ID.uc.r.appspot.com\",
      \"https://$GCP_PROJECT_ID.uc.r.appspot.com\",
      \"http://localhost:3000\"
    ],
    \"method\": [\"GET\",\"PUT\"],
    \"responseHeader\": [\"Content-Type\"],
    \"maxAgeSeconds\": 3600
  }
]" > .scripts/terraform/storage-cors.json

echo "{
  \"rule\": [
    {
      \"action\": {
        \"type\": \"Delete\"
      },
      \"condition\": {
        \"age\": 7,
        \"matchesPrefix\": [
          \"sessions/\"
        ]
      }
    }
  ]
}" > .scripts/terraform/storage-ttl.json

for ENV in "${ENVS[@]}"; do
    BUCKET_URI="gs://$GCP_PROJECT_ID-storage-$ENV"
    
    gcloud storage buckets update \
        "$BUCKET_URI" \
        --lifecycle-file=./.scripts/terraform/storage-ttl.json \
        --cors-file=./.scripts/terraform/storage-cors.json \
        --project="$GCP_PROJECT_ID"

done

echo "Completed Cloud Storage operations..."

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - END active test area
# 

