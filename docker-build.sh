#!/usr/bin/env bash

set -euo

FABLO_REST_HOME="$(cd "$(dirname "$0")" && pwd)"
FABLO_REST_VERSION=$(jq -r '.version' <"$FABLO_REST_HOME/package.json")
DOCKER_IMAGE_BASE_NAME="softwaremill/fablo-rest"
DOCKER_IMAGE_TAG="$DOCKER_IMAGE_BASE_NAME:$FABLO_REST_VERSION"

echo "Building new image..."
echo "   FABLO_REST_HOME:    $FABLO_REST_HOME"
echo "   FABLO_REST_VERSION: $FABLO_REST_VERSION"
echo "   DOCKER_IMAGE_TAG:     [$DOCKER_IMAGE_BASE_NAME, $DOCKER_IMAGE_TAG]"

npm install --silent
npm run build

docker build --tag "$DOCKER_IMAGE_TAG" "$FABLO_REST_HOME"
docker tag "$DOCKER_IMAGE_TAG" "$DOCKER_IMAGE_BASE_NAME"
