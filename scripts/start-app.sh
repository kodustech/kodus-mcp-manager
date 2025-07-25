#!/bin/bash

# O primeiro argumento é o ambiente: qa ou prod
ENVIRONMENT=$1
GITHUB_SHA=$2
GITHUB_REF=$3
export CONTAINER_NAME="kodus-mcp-manager-${ENVIRONMENT}-${GITHUB_SHA}"

# Configurar URL do ECR baseada no ambiente
export ECR_URL="[url-do-ecr]/kodus-mcp-manager-${ENVIRONMENT}"

# Autenticação do Docker com o ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_URL}

# Buscar variáveis de ambiente do AWS Parameter Store
./fetch-env.sh $ENVIRONMENT

export NODE_ENV=production
# Exportar a imagem apropriada baseada no ambiente
if [ "$ENVIRONMENT" == "qa" ]; then
    export IMAGE_NAME="${ECR_URL}:${GITHUB_SHA}"
elif [ "$ENVIRONMENT" == "prod" ]; then
    # Extrai a tag do GITHUB_REF
    GITHUB_TAG=${GITHUB_REF/refs\/tags\//}
    export IMAGE_NAME="${ECR_URL}:${GITHUB_TAG}"
fi

# Usar Docker Compose para iniciar o contêiner
docker compose -f docker-compose.$ENVIRONMENT.yml up -d --force-recreate

docker system prune -f -a
