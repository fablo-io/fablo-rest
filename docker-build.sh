#!/usr/bin/env bash

set -euo

FABLO_REST_HOME="$(cd "$(dirname "$0")" && pwd)"
FABLO_REST_VERSION=$(jq -r '.version' <"$FABLO_REST_HOME/package.json")
DOCKER_IMAGE_BASE_NAME="ghcr.io/fablo-io/fablo-rest"
DOCKER_IMAGE_TAG="$DOCKER_IMAGE_BASE_NAME:$FABLO_REST_VERSION"

COMMIT_HASH=$(git rev-parse --short HEAD)
BUILD_DATE=$(date +'%Y-%m-%d-%H:%M:%S')
VERSION_DETAILS="$BUILD_DATE-$COMMIT_HASH"

echo "Building new image..."
echo "   FABLO_REST_HOME:    $FABLO_REST_HOME"
echo "   FABLO_REST_VERSION: $FABLO_REST_VERSION"
echo "   DOCKER_IMAGE_TAG:   [$DOCKER_IMAGE_BASE_NAME, $DOCKER_IMAGE_TAG]"
echo "   VERSION_DETAILS:    $VERSION_DETAILS"

npm install --silent
npm run build

# if --push is passed, then build for all platforms and push the image to the registry
if [ "${1:-''}" = "--push" ]; then
  docker buildx build \
    --build-arg VERSION_DETAILS="$VERSION_DETAILS" \
    --platform linux/amd64,linux/arm64 \
    --tag "$DOCKER_IMAGE_TAG" \
    --tag "$DOCKER_IMAGE_BASE_NAME:latest" \
    --push \
    "$FABLO_REST_HOME"
else
  docker buildx build \
    --build-arg VERSION_DETAILS="$VERSION_DETAILS" \
    --platform linux/amd64 \
    --tag "$DOCKER_IMAGE_TAG" \
    --tag "$DOCKER_IMAGE_BASE_NAME:latest" \
    "$FABLO_REST_HOME"
fi

