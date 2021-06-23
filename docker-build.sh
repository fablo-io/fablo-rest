#!/usr/bin/env bash

set -euo

FABRICA_REST_HOME="$(cd "$(dirname "$0")" && pwd)"
FABRICA_REST_VERSION=$(jq -r '.version' <"$FABRICA_REST_HOME/package.json")

COMMIT_HASH=$(git rev-parse --short HEAD)
BUILD_DATE=$(date +'%Y-%m-%d-%H:%M:%S')
VERSION_DETAILS="$BUILD_DATE-$COMMIT_HASH"
DOCKER_IMAGE_BASE_NAME="softwaremill/fabrica-rest"
DOCKER_IMAGE_TAG="$DOCKER_IMAGE_BASE_NAME:$FABRICA_REST_VERSION"

echo "Building new image..."
echo "   FABRICA_REST_HOME:    $FABRICA_REST_HOME"
echo "   FABRICA_REST_VERSION: $FABRICA_REST_VERSION"
echo "   VERSION_DETAILS:      $VERSION_DETAILS"
echo "   DOCKER_IMAGE_TAG:     [$DOCKER_IMAGE_BASE_NAME, $DOCKER_IMAGE_TAG]"


npm install --silent
npm run build

docker build --tag "$DOCKER_IMAGE_TAG" "$FABRICA_REST_HOME"
docker tag "$DOCKER_IMAGE_TAG" "$DOCKER_IMAGE_BASE_NAME"
