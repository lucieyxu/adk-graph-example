# Terraforming & Project Initialization
These steps are to be taken by a Demos & Experiments engineer or creative technologist. If you are not this person, these steps will be completed before you can start contributing to the project.

## Terraform New Demo

- Prereqs: all the steps in the [Create New Demo Checklist](https://docs.google.com/document/d/1wMPJkKSGL_Y5TVleOLTMRbw4RCbBvt18Sm8kCkEQyME/edit?usp=sharing&resourcekey=0-0_XBexG_LNn2-vplwMYFxQ) up to "Terraform"

#### 1. Terraform GCP: Service Accounts, IAM roles, APIs, Cloud Build

- `cd` into the repo
- Run `mise trust`
- Run `mise install`
- Run `mise terraform-gcp`
- When prompted, enter the GCP Project ID (e.g. `__GCP_PROJECT_ID__`)
- Follow instructions to log in and allow access
- The script will create a service account and grant the standard set of IAM access & roles, enable the various APIs, connect the GitHub repo to the GCP project, create Cloud Build triggers, enable IAP authentication, and more.
  - _Note: this runs as your user (e.g, rutledgeb@google.com). Everything else after this point should be run impersonating the service account._

#### 2. Terraform Populate: Find/Replace in Repo

- Locate the following information for the project:
  - GCP Project ID (e.g. `__GCP_PROJECT_ID__`)
  - Project Name (e.g. `__PROJECT_NAME__`)
  - Google Analytics Tag ID / Measurement ID (e.g. `__NEXT_PUBLIC_GA_TAG_ID__`)
- `cd` into the repo, and run `mise terraform-populate` to find and replace all placeholder values
  - Note: this operation can be reversed with `mise terraform-unpopulate`
- Enter the requested information when prompted
- This will find and replace all placeholder values with the IDs, create a `staging` branch, commit the changes, and push the new branch.
- Go back to the [repo on Github](https://github.com/delta-fde/__GCP_PROJECT_ID__)
- Create & approve a pull request from `staging` into `prod`
- Now both `staging` and `prod` branches will be up to date with no placeholder values