#!/usr/bin/env bash

#
# You need to run './fabrica up' before this script to have running Hyperledger Fabric network
#
(
  set -e
  cd ..

  ./docker-build.sh

  docker run \
    -e PORT=9999 \
    -e AFFILIATION="org2" \
    -e MSP_ID="Org2MSP" \
    -e FABRIC_CA_URL="http://localhost:7032" \
    -e DISCOVERY_URLS="grpc://localhost:7060,grpc://localhost:7070" \
    -e AS_LOCALHOST="true" \
    -p 9998:9999 \
    -d \
    --rm \
    softwaremill/fabrica-rest &

  server_pid="$!"
  echo "Started server with PID $server_pid at port $PORT"
  trap "echo 'Stopping server' && kill $server_pid" EXIT SIGINT ERR
  sleep 5

  # run tests
  PORT=9998 \
    AFFILIATION="org2" \
    MSP_ID="Org2MSP" \
    FABRIC_CA_URL="http://localhost:7032" \
    DISCOVERY_URLS="grpc://localhost:7060,grpc://localhost:7070" \
    AS_LOCALHOST="true" \
    npm run test-e2e
)

  TODO stop docker
