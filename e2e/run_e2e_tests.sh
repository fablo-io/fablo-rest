#!/usr/bin/env bash

#
# You need to run './fabrica up' before this script to have running Hyperledger Fabric network
#
(
  set -e
  cd ..

  # start server in dist mode
  yarn clean
  yarn build
  PORT=9999 node dist/index.js &
  server_pid="$!"
  echo "Started server with PID $server_pid at port $PORT"
  trap "echo 'Stopping server' && kill $server_pid" EXIT
  sleep 5

  # run tests
  PORT=9999 \
    AFFILIATION="org2" \
    MSP_ID="Org2MSP" \
    FABRIC_CA_URL="http://localhost:7032" \
    DISCOVERY_URLS="grpc://localhost:7060,grpc://localhost:7070" \
    AS_LOCALHOST="true" \
    yarn test-ci e2e
)
