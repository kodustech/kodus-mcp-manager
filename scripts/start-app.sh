#!/bin/bash

# The first argument is the environment: qa or prod
ENVIRONMENT=$1
GITHUB_SHA=$2
GITHUB_REF=$3
export CONTAINER_NAME="kodus-mcp-manager-${ENVIRONMENT}-${GITHUB_SHA}"

# Configure ECR URL based on environment
export ECR_URL="[url-do-ecr]/kodus-mcp-manager-${ENVIRONMENT}"

# Docker authentication with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_URL}

# Fetch environment variables from AWS Parameter Store
./fetch-env.sh $ENVIRONMENT

export NODE_ENV=production
# Export the appropriate image based on environment
if [ "$ENVIRONMENT" == "qa" ]; then
    export IMAGE_NAME="${ECR_URL}:${GITHUB_SHA}"
elif [ "$ENVIRONMENT" == "prod" ]; then
    # Extract tag from GITHUB_REF
    GITHUB_TAG=${GITHUB_REF/refs\/tags\//}
    export IMAGE_NAME="${ECR_URL}:${GITHUB_TAG}"
else
    echo "Error: Invalid environment '$ENVIRONMENT'. Allowed values: qa, prod"
    exit 1
fi

# Use Docker Compose to start the container
docker compose -f docker-compose.$ENVIRONMENT.yml up -d --force-recreate

docker system prune -f -a
