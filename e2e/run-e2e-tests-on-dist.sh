#!/usr/bin/env bash

#
# You need to run './fablo up' before this script to have running Hyperledger Fabric network
# and execute ./docker-build.sh script to build fablo-rest Docker image.
#
set -e

FABLO_REST_HOME="$(cd "$(dirname "$0")/.." && pwd)"
cd "$FABLO_REST_HOME"

#
# Get network name from fablo-target
#
network_name="$(cat "$FABLO_REST_HOME/test-network/fablo-target/fabric-docker/.env" | grep "COMPOSE_PROJECT_NAME=")"
network_name="${network_name#*=}_basic"
echo "Network name: $network_name"

#
# Start application in the container.
#
container=fablo_rest_test
port=8000
docker run \
  -e PORT=9999 \
  -e AFFILIATION="org2" \
  -e MSP_ID="Org2MSP" \
  -e FABRIC_CA_URL="http://ca.org2.com:7054" \
  -e FABRIC_CA_NAME="ca.org2.com" \
  -e DISCOVERY_URLS="grpcs://peer0.org2.com:7070,grpcs://peer1.org2.com:7071" \
  -e DISCOVERY_TLS_CA_CERT_FILES="/peer-crypto/org2.com/peers/peer0.org2.com/tls/ca.crt,/peer-crypto/org2.com/peers/peer1.org2.com/tls/ca.crt" \
  -e AS_LOCALHOST="false" \
  -p "$port:9999" \
  --network="$network_name" \
  -v "$FABLO_REST_HOME/test-network/fablo-target/fabric-config/crypto-config/peerOrganizations:/peer-crypto"\
  -d \
  --rm \
  --name "$container" \
  softwaremill/fablo-rest

echo "Started server on container $container at port $port"
trap "echo 'Stopping container $container' && docker stop $container" EXIT SIGINT ERR
sleep 5

#
# Run tests
#
PORT=8000 \
  AFFILIATION="org2" \
  MSP_ID="Org2MSP" \
  FABRIC_CA_NAME="ca.org2.com" \
  npm run test-e2e
