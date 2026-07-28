#!/bin/bash

# ENSURE we are at the repo root
cd "$(dirname "$0")"
cd ../..

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - GET user input
# 

echo "Google Cloud Demos: Terraformer | IAM"
read -p "1. Enter the GCP project ID (Must start with gcdemos...): " GCP_PROJECT_ID
read -p "2. Enter the GitHub owner/organization (default: delta-fde): " GH_OWNER
GH_OWNER=${GH_OWNER:-delta-fde}

GCP_PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format="value(projectNumber)")

# CONFIRM user input is correct
echo "- - - - -"
echo "You entered:"
echo "GCP Project ID: $GCP_PROJECT_ID"
echo "GCP Project Number: $GCP_PROJECT_NUMBER"
echo "GitHub Owner/Org: $GH_OWNER"
echo "- - - - -"
while true; do
    read -p "Review the above information, and confirm that you want to proceed with service account creation and IAM settings (Y/n):" yn
    case $yn in 
        [yY] ) echo "Proceeding with service account and IAM operation...";
            break;;
        [nN] ) echo Exiting...;
            exit;;
        * ) echo invalid response;;
    esac
done

ENVS=( 
    "dev"
    "staging"
    "prod"
)

DEPLOYED_ENVS=( 
    "staging"
    "prod"
)

CLOUDSDK_CORE_PROJECT="$GCP_PROJECT_ID"

yes | gcloud config set project "$GCP_PROJECT_ID"

gcloud auth login

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Service Accounts & IAM
# 

echo "Starting service account creation & IAM bootstrapping process..."

# CREATE default service account and add roles
DEFAULT_SERVICE_ACCOUNT_ID="default-service-account"
DEFAULT_SERVICE_ACCOUNT_ROLES=( 
    "roles/ml.admin"
    "roles/artifactregistry.writer"
    "roles/datastore.user"
    "roles/run.admin"
    "roles/run.invoker"
    "roles/serviceusage.serviceUsageConsumer"
    "roles/firestore.serviceAgent"
    "roles/logging.logWriter"
    "roles/secretmanager.secretAccessor"
    "roles/iam.serviceAccountTokenCreator"
    "roles/appengine.appAdmin"
    "roles/storage.admin"
    "roles/storage.objectAdmin"
    "roles/aiplatform.admin"
    "roles/aiplatform.user"
    "roles/firebase.admin"
    "roles/firebasedatabase.admin"
    "roles/workflows.admin"
)
D_SA_FULL="$DEFAULT_SERVICE_ACCOUNT_ID@$GCP_PROJECT_ID.iam.gserviceaccount.com"
echo "Creating default service account"
gcloud iam service-accounts create $DEFAULT_SERVICE_ACCOUNT_ID \
    --project=$GCP_PROJECT_ID \
    --display-name="serviceaccount" \
    --description="default service account" \
    --no-user-output-enabled
sleep 10
for ROLE in "${DEFAULT_SERVICE_ACCOUNT_ROLES[@]}"; do
    echo "Adding role \"$ROLE\" to default service account"
    gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
        --no-user-output-enabled \
        --member="serviceAccount:$D_SA_FULL" \
        --role="$ROLE" \
        --condition="None"
done

# # CREATE cloud build service account and add roles
CLOUD_BUILD_SERVICE_ACCOUNT_ID="cloud-build"
CLOUD_BUILD_SERVICE_ACCOUNT_ROLES=( 
    "roles/artifactregistry.writer"
    "roles/run.admin"
    "roles/run.invoker"
    "roles/logging.logWriter"
    "roles/cloudbuild.builds.builder"
    "roles/serviceusage.serviceUsageConsumer"
    "roles/secretmanager.admin"
    "roles/iam.serviceAccountTokenCreator"
    "roles/iam.serviceAccountUser"
    "roles/appengine.appAdmin"
    "roles/appengineflex.serviceAgent"
    "roles/storage.admin"
    "roles/storage.objectAdmin"
    "roles/firebase.admin"
    "roles/workflows.admin"
)
CB_SA_FULL="$CLOUD_BUILD_SERVICE_ACCOUNT_ID@$GCP_PROJECT_ID.iam.gserviceaccount.com"
echo "Creating cloud build service account"
gcloud iam service-accounts create $CLOUD_BUILD_SERVICE_ACCOUNT_ID \
    --project=$GCP_PROJECT_ID \
    --display-name="serviceaccount" \
    --description="build service account" \
    --no-user-output-enabled
sleep 10
for ROLE in "${CLOUD_BUILD_SERVICE_ACCOUNT_ROLES[@]}"; do
    echo "Adding role \"$ROLE\" to cloud build service account"
    gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
        --no-user-output-enabled \
        --member="serviceAccount:$CB_SA_FULL" \
        --role="$ROLE" \
        --condition="None"
done


# GRANT permissions to the internal developer google groups
GOOGLER_DEV_ROLES=( 
    "roles/editor"
    "roles/iam.serviceAccountUser"
    "roles/iam.serviceAccountTokenCreator"
    "roles/iap.httpsResourceAccessor"
)
GLOBAL_GOOGLERS_DEV_GROUP="gcdemos-26-int-alldemos-googlers@google.com"
PROJECT_GOOGLERS_DEV_GROUP="$GCP_PROJECT_ID-googlers@google.com"
for ROLE in "${GOOGLER_DEV_ROLES[@]}"; do
    echo "Adding role \"$ROLE\" to global dev group"
    gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
        --no-user-output-enabled \
        --member="group:$GLOBAL_GOOGLERS_DEV_GROUP" \
        --role="$ROLE"
    
    echo "Adding role \"$ROLE\" to project dev group"
    gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
        --no-user-output-enabled \
        --member="group:$PROJECT_GOOGLERS_DEV_GROUP" \
        --role="$ROLE"
done

# GRANT permissions to the external developer google groups
EXT_DEV_ROLES=( 
    "roles/viewer"
    "roles/iam.serviceAccountUser"
    "roles/iam.serviceAccountTokenCreator"
    "roles/iap.httpsResourceAccessor"
    "roles/serviceusage.serviceUsageConsumer"
)
PROJECT_EXT_DEV_GROUP="$GCP_PROJECT_ID-dev-external@google.com"
for ROLE in "${EXT_DEV_ROLES[@]}"; do
    echo "Adding role \"$ROLE\" to project dev group"
    gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
        --no-user-output-enabled \
        --member="group:$PROJECT_EXT_DEV_GROUP" \
        --role="$ROLE"
done

# GRANT permissions to the user google groups
USERS_ROLES=( 
    "roles/iap.httpsResourceAccessor"
)
GLOBAL_EXT_USERS_GROUP="gcdemos-26-int-alldemos-users-external@google.com"
PROJECT_EXT_USERS_GROUP="$GCP_PROJECT_ID-users-external@google.com"
for ROLE in "${USERS_ROLES[@]}"; do
    echo "Adding role \"$ROLE\" to global dev group"
    gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
        --no-user-output-enabled \
        --member="group:$GLOBAL_EXT_USERS_GROUP" \
        --role="$ROLE"
    
    echo "Adding role \"$ROLE\" to project dev group"
    gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
        --no-user-output-enabled \
        --member="group:$PROJECT_EXT_USERS_GROUP" \
        --role="$ROLE"
done

echo "Created service accounts & applied standard IAM settings"

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  Enable APIs
# 

SERVICES=( 
    "aiplatform.googleapis.com"
    "appengine.googleapis.com"
    "appenginereporting.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudaicompanion.googleapis.com"
    "cloudbuild.googleapis.com"
    "cloudfunctions.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "compute.googleapis.com"
    "containeranalysis.googleapis.com"
    "containerfilesystem.googleapis.com"
    "containerregistry.googleapis.com"
    "dataproc.googleapis.com"
    "fcm.googleapis.com"
    "firebase.googleapis.com"
    "firebaseappdistribution.googleapis.com"
    "firebasedatabase.googleapis.com"
    "firebasedynamiclinks.googleapis.com"
    "firebasehosting.googleapis.com"
    "firebaseinstallations.googleapis.com"
    "firebaseremoteconfig.googleapis.com"
    "firebaseremoteconfigrealtime.googleapis.com"
    "firebaserules.googleapis.com"
    "firestore.googleapis.com"
    "firestorekeyvisualizer.googleapis.com"
    "geminicloudassist.googleapis.com"
    "iam.googleapis.com"
    "iamcredentials.googleapis.com"
    "iap.googleapis.com"
    "identitytoolkit.googleapis.com"
    "networkservices.googleapis.com"
    "pubsub.googleapis.com"
    "run.googleapis.com"
    "runtimeconfig.googleapis.com"
    "secretmanager.googleapis.com"
    "securetoken.googleapis.com"
    "sourcerepo.googleapis.com"
    "texttospeech.googleapis.com"
    "videointelligence.googleapis.com"
    "visionai.googleapis.com"
    "websecurityscanner.googleapis.com"
    "workflows.googleapis.com"
    "workflowexecutions.googleapis.com"
)
for SERVICE in "${SERVICES[@]}"; do
    echo "Enabling service \"$SERVICE\" in project"
    gcloud services enable "$SERVICE" --project "$GCP_PROJECT_ID" &
done
echo "Waiting for all services to be enabled..."
wait

# RUN funky command as workaround to allow Gemini / AI agents access to bucket files, allowing us to
# provide GCS URI's instead of base64 images
gcloud services list --enabled | grep aiplatform
gcloud ai endpoints list --region=us-central1

echo "Enabled all services"

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  Initialize Firebase
# 

echo "Starting Firebase initialization operations..."

# INIT firebase app attached to GCP project
firebase login
firebase projects:addfirebase "$GCP_PROJECT_ID"
firebase apps:create --project "$GCP_PROJECT_ID" web "$GCP_PROJECT_ID"
firebase init database --project "$GCP_PROJECT_ID"
firebase init firestore --project "$GCP_PROJECT_ID"

# CREATE 3 realtime database instances, one for each env
firebase database:instances:create --project "$GCP_PROJECT_ID" "$GCP_PROJECT_ID-dev"
firebase database:instances:create --project "$GCP_PROJECT_ID" "$GCP_PROJECT_ID-staging"
firebase database:instances:create --project "$GCP_PROJECT_ID" "$GCP_PROJECT_ID-prod"
firebase target:apply database all "$GCP_PROJECT_ID-dev"
firebase target:apply database all "$GCP_PROJECT_ID-staging"
firebase target:apply database all "$GCP_PROJECT_ID-prod"

# CREATE 3 firestore database instances, one for each env
firebase firestore:databases:create --project "$GCP_PROJECT_ID" --location "us-central1" "$GCP_PROJECT_ID-dev"
firebase firestore:databases:create --project "$GCP_PROJECT_ID" --location "us-central1" "$GCP_PROJECT_ID-staging"
firebase firestore:databases:create --project "$GCP_PROJECT_ID" --location "us-central1" "$GCP_PROJECT_ID-prod"

# ENABLE ttl for the sessions data
gcloud firestore fields ttls update expires_at --collection-group=sessions --database="$GCP_PROJECT_ID-dev" --project "$GCP_PROJECT_ID" --enable-ttl --async
gcloud firestore fields ttls update expires_at --collection-group=sessions --database="$GCP_PROJECT_ID-staging" --project "$GCP_PROJECT_ID" --enable-ttl --async
gcloud firestore fields ttls update expires_at --collection-group=sessions --database="$GCP_PROJECT_ID-prod" --project "$GCP_PROJECT_ID" --enable-ttl --async

# ENABLE ttl for the events data
gcloud firestore fields ttls update expires_at --collection-group=events --database="$GCP_PROJECT_ID-dev" --project "$GCP_PROJECT_ID" --enable-ttl --async
gcloud firestore fields ttls update expires_at --collection-group=events --database="$GCP_PROJECT_ID-staging" --project "$GCP_PROJECT_ID" --enable-ttl --async
gcloud firestore fields ttls update expires_at --collection-group=events --database="$GCP_PROJECT_ID-prod" --project "$GCP_PROJECT_ID" --enable-ttl --async

echo '{
  "rules":{
    ".read": "auth.uid !== null && auth.token.read === true",
    ".write": "auth.uid !== null && auth.token.write === true",
    "sessions": {
    	"$docId": {
        ".read": "auth.uid !== null && $docId === auth.uid"
      }
    }
	}
}' > database.rules.json

echo "{
    \"database\": [{ \"target\": \"all\", \"rules\": \"database.rules.json\" }],
    \"firestore\": [
        {
            \"database\": \"$GCP_PROJECT_ID-dev\",
            \"rules\": \"firestore.rules\",
            \"indexes\": \"firestore.indexes.json\"
        },
        {
            \"database\": \"$GCP_PROJECT_ID-staging\",
            \"rules\": \"firestore.rules\",
            \"indexes\": \"firestore.indexes.json\"
        },
        {
            \"database\": \"$GCP_PROJECT_ID-prod\",
            \"rules\": \"firestore.rules\",
            \"indexes\": \"firestore.indexes.json\"
        }
    ]
}" > firebase.json

echo "rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if request.auth != null && request.auth.token.read == true;
      allow write: if request.auth != null && request.auth.token.write == true;
    }
    match /sessions/{docId} {
      allow read: if request.auth != null && docId == request.auth.uid;
    }
  }
}" > firestore.rules

echo '{
    "indexes": [
        {
            "collectionGroup": "sessions",
            "queryScope": "COLLECTION",
            "fields": [
                {
                    "fieldPath": "event_id",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "score",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "__name__",
                    "order": "ASCENDING"
                }
            ],
            "density": "SPARSE_ALL"
        },
        {
            "collectionGroup": "sessions",
            "queryScope": "COLLECTION",
            "fields": [
                {
                    "fieldPath": "event_id",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "started_at",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "__name__",
                    "order": "ASCENDING"
                }
            ],
            "density": "SPARSE_ALL"
        },
        {
            "collectionGroup": "sessions",
            "queryScope": "COLLECTION",
            "fields": [
                {
                    "fieldPath": "event_id",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "started_at",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "created_at",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "__name__",
                    "order": "ASCENDING"
                }
            ],
            "density": "SPARSE_ALL"
        },
        {
            "collectionGroup": "sessions",
            "queryScope": "COLLECTION",
            "fields": [
                {
                    "fieldPath": "event_id",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "score",
                    "order": "DESCENDING"
                },
                {
                    "fieldPath": "started_at",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "__name__",
                    "order": "DESCENDING"
                }
            ],
            "density": "SPARSE_ALL"
        },
        {
            "collectionGroup": "sessions",
            "queryScope": "COLLECTION",
            "fields": [
                {
                    "fieldPath": "event_id",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "score",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "started_at",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "__name__",
                    "order": "ASCENDING"
                }
            ],
            "density": "SPARSE_ALL"
        },
        {
            "collectionGroup": "sessions",
            "queryScope": "COLLECTION",
            "fields": [
                {
                    "fieldPath": "event_id",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "score",
                    "order": "DESCENDING"
                },
                {
                    "fieldPath": "started_at",
                    "order": "DESCENDING"
                },
                {
                    "fieldPath": "__name__",
                    "order": "DESCENDING"
                }
            ],
            "density": "SPARSE_ALL"
        }
    ],
    "fieldOverrides": [
        {
            "collectionGroup": "events",
            "fieldPath": "expires_at",
            "ttl": true,
            "indexes": [
                {
                    "order": "ASCENDING",
                    "queryScope": "COLLECTION"
                },
                {
                    "order": "DESCENDING",
                    "queryScope": "COLLECTION"
                },
                {
                    "arrayConfig": "CONTAINS",
                    "queryScope": "COLLECTION"
                }
            ]
        },
        {
            "collectionGroup": "sessions",
            "fieldPath": "expires_at",
            "ttl": true,
            "indexes": [
                {
                    "order": "ASCENDING",
                    "queryScope": "COLLECTION"
                },
                {
                    "order": "DESCENDING",
                    "queryScope": "COLLECTION"
                },
                {
                    "arrayConfig": "CONTAINS",
                    "queryScope": "COLLECTION"
                }
            ]
        }
    ]
}' > firestore.indexes.json

firebase deploy --only "database:all"

for ENV in "${ENVS[@]}"; do
    DB_ID="${GCP_PROJECT_ID}-${ENV}"
    firebase deploy --only "firestore:$DB_ID"
done

# PERSIST firebase app config to repo
firebase apps:sdkconfig web --project "$GCP_PROJECT_ID" --json \
    | jq '.result.sdkConfig' \
    | jq ".databaseURL = \"https://$GCP_PROJECT_ID-__ENV__.firebaseio.com\"" \
    > shared/config/firebase-config.json

# CLEAN up temp files
rm -f .firebaserc
rm -f firebase.json
rm -f firestore.rules
rm -f database.rules.json
rm -f firestore.indexes.json


echo "Open the following URL:
- - - -
https://firebase.corp.google.com/project/$GCP_PROJECT_ID/authentication
- - - -
1. Click \"Get started\"
2. Do nothing else :)"

read -p "Once you have done so, press enter to continue..."

echo "Completed AppEngine operations..."

echo "Completed Firebase initialization"

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Create Storage Buckets
# 

echo "Starting Cloud Storage operations..."

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
    
    gcloud storage buckets create "$BUCKET_URI" \
        --project="$GCP_PROJECT_ID" \
        --location=us-central1 \
        --default-storage-class=standard \
        --uniform-bucket-level-access \
        --public-access-prevention \
        --soft-delete-duration=0

    gcloud storage buckets update \
        "$BUCKET_URI" \
        --lifecycle-file=./.scripts/terraform/storage-ttl.json \
        --cors-file=./.scripts/terraform/storage-cors.json \
        --project="$GCP_PROJECT_ID"

done

echo "Completed Cloud Storage operations..."

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  Create Cloud Build triggers
# 

echo "Starting Cloud Build operations..."

TEMP_CLOUD_BUILD_SERVICE_AGENT="service-${GCP_PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
    --member="serviceAccount:${TEMP_CLOUD_BUILD_SERVICE_AGENT}" \
    --role="roles/secretmanager.admin" \
    --no-user-output-enabled \
    --condition="None"

sleep 3

gcloud builds connections create github github --region=us-central1 --project="$GCP_PROJECT_ID"

echo "- - - -"
read -p "Click the link above, log in, click Continue to allow, and then click \"$GH_OWNER organization\". Once you have done so and the web page says 'Connection configured successfully', then come back here and press enter to continue..."

gcloud builds repositories create "$GCP_PROJECT_ID" \
    --project="$GCP_PROJECT_ID" \
     --remote-uri="https://github.com/$GH_OWNER/$GCP_PROJECT_ID.git" \
     --connection=github \
     --region=us-central1 \

for ENV in "${DEPLOYED_ENVS[@]}"; do
    echo "Creating build trigger for $ENV..."
    gcloud beta builds triggers create github \
        --project="$GCP_PROJECT_ID" \
        --name="$ENV" \
        --region=us-central1 \
        --repository="projects/$GCP_PROJECT_ID/locations/us-central1/connections/github/repositories/$GCP_PROJECT_ID" \
        --branch-pattern="^$ENV$" \
        --build-config=cloudbuild.yaml \
        --service-account="projects/$GCP_PROJECT_ID/serviceAccounts/$CB_SA_FULL" \
        --include-logs-with-status
done

ssh-keygen -t rsa -b 4096 -N '' -f "$GCP_PROJECT_ID-github-ssh"

gcloud secrets create github-deploy \
    --project="$GCP_PROJECT_ID" \
    --replication-policy="automatic"

gcloud secrets versions add github-deploy \
    --project="$GCP_PROJECT_ID" \
    --data-file="$GCP_PROJECT_ID-github-ssh"

echo "- - - - Copy this pub key:"
cat "$GCP_PROJECT_ID-github-ssh.pub"
echo "- - - - Open this URL:"
echo "https://github.com/$GH_OWNER/$GCP_PROJECT_ID/settings/keys"
echo "- - - - "
echo "Using the key and URL above, create a new deploy key in the GitHub repo:"
echo "  1. Click "Add deploy key""
echo "  2. Name the key 'cloud-build'"
echo "  3. Paste the contents of the pub key"
echo "  4. Leave 'Allow write access' unchecked and disabled."
echo "  5. Click 'Add key'"
read -p "Once you have done so, press enter to continue..."

rm -f "$GCP_PROJECT_ID-github-ssh"
rm -f "$GCP_PROJECT_ID-github-ssh.pub"

gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
    --member="serviceAccount:${TEMP_CLOUD_BUILD_SERVICE_AGENT}" \
    --role="roles/secretmanager.admin" \
    --no-user-output-enabled

echo "Completed Cloud Build operations..."

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Init AppEngine
# 

echo "Starting AppEngine operations..."

echo "Open the following URL:
- - - -
https://console.cloud.google.com/appengine/start?project=$GCP_PROJECT_ID
- - - -
1. Click \"Create Application\"
2. Select \"us-central\" for region
3. Select $D_SA_FULL for Identity and API Access (service account)"

read -p "Once you have done so, press enter to continue..."

echo "Completed AppEngine operations..."



# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  Init CloudRun
# 

echo "Starting CloudRun operations..."

echo "Open the following URL:
- - - -
https://console.cloud.google.com/run/create?enableapi=false&deploymentType=repository&project=$GCP_PROJECT_ID
- - - -
1. Click \"Github\"
2. Click Set up with Cloud Build
3. Click "Authenticate"
4. Select the proper repository
5. Click the checkbox to agree
6. Leave the Build Type as the default option (Dockerfile)
7. Click "Next"
8. Under "Configure", ensure that us-central1 is selected for Region
9. Click "Require Authentication"
10. Leave all other defaults, click "Create"
11. Delete the cloud run service we just created.
12. Go to Cloud Build > Triggers, and delete the new trigger that has a long and crazy name"

read -p "Once you have done so, press enter to continue..."

echo "Completed CloudRun operations..."

# 
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  Init Identity Aware Proxy
# 

echo "Starting IAP operations..."

echo "Open the following URL:
- - - 
https://console.cloud.google.com/auth/overview?project=$GCP_PROJECT_ID
- - -
1. Click "Get started"
2. Enter the project name for "App name"
3. Enter gcdemos-support@google.com for "User support email"
4. Audience: select "External"
5. Contact Information: Enter gcdemos-support@google.com
6. Finish: Click the checkbox to agree.
7. Click "Create"
8. Click the tab in the left pane for "Audience"
9. Click "Publish app"
"
read -p "Once you have done so, press enter to continue..."

gcloud beta services identity create \
    --service=iap.googleapis.com \
    --project="$GCP_PROJECT_ID"

gcloud iap web enable --resource-type=app-engine

echo "accessSettings:
  corsSettings:
    allowHttpOptions: true
  allowedDomainsSettings:
    enable: false
applicationSettings:
  attributePropagationSettings:
    enable: false
name: projects/$GCP_PROJECT_NUMBER/iap_web/appengine-$GCP_PROJECT_ID
" > iap-settings.yaml

gcloud iap settings set iap-settings.yaml --resource-type=app-engine --project=$GCP_PROJECT_ID

rm -f iap-settings.yaml

echo "Completed IAP operations..."

echo "
- - - -
- - - -
- - - -
- - - -

Completed GCP Terraform operations!

- - - -
- - - -
- - - -
- - - -"
