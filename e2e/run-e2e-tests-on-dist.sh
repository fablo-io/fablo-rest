#!/usr/bin/env bash

#
# You need to run './fabrica up' before this script to have running Hyperledger Fabric network
#
(
  set -e
  cd ..

  #
  # Build Docker image
  #
  ./docker-build.sh

  #
  # Start application in the container.
  #
  # Note: it works only on linux and won't work on OSX. We cannot use host.docker.internal here,
  # we need localhost to refer to the host where fabric network is set up.
  #
  container=fabrica_rest_test
  port=8000
  docker run \
    -e PORT=9999 \
    -e AFFILIATION="org2" \
    -e MSP_ID="Org2MSP" \
    -e FABRIC_CA_URL="http://localhost:7032" \
    -e DISCOVERY_URLS="grpc://localhost:7060,grpc://localhost:7070" \
    -e AS_LOCALHOST="true" \
    -p "$port:9999" \
    --network="host" \
    -d \
    --rm \
    --name "$container" \
    softwaremill/fabrica-rest

  echo "Started server on container $container at port $port"
  trap "echo 'Stopping container $container' && docker stop $container" EXIT SIGINT ERR
  sleep 5

  #
  # Run tests
  #
  PORT=8000 \
    AFFILIATION="org2" \
    MSP_ID="Org2MSP" \
    FABRIC_CA_URL="http://localhost:7032" \
    DISCOVERY_URLS="grpc://localhost:7060,grpc://localhost:7070" \
    AS_LOCALHOST="true" \
    npm run test-e2e
)
