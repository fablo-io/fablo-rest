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
  # Get network name from fabrica-target
  #
  network_name="$(cat test-network/fabrica-target/fabric-docker/.env | grep "COMPOSE_PROJECT_NAME=")"
  network_name="${network_name#*=}_basic"
  echo "Network name: $network_name"

  #
  # Start application in the container.
  #
  container=fabrica_rest_test
  port=8000
  docker run \
    -e PORT=9999 \
    -e AFFILIATION="org2" \
    -e MSP_ID="Org2MSP" \
    -e FABRIC_CA_URL="http://ca.org2.com:7054" \
    -e DISCOVERY_URLS="grpc://peer0.org1.com:7060,grpc://peer0.org2.com:7070" \
    -e AS_LOCALHOST="false" \
    -p "$port:9999" \
    --network="$network_name" \
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
    FABRIC_CA_URL="http://ca.org2.com:7054" \
    DISCOVERY_URLS="grpc://peer0.org1.com:7060,grpc://peer0.org2.com:7070" \
    AS_LOCALHOST="false" \
    npm run test-e2e
)
