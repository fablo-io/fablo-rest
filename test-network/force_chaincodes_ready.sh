#!/usr/bin/env bash

set -e

function instantiate() {
  echo "Querying 'KVContract:instantiate' on $2"
  response="$(docker exec "$1" peer chaincode query \
    -C "my-channel1" \
    -n "chaincode1" \
    -c "{\"Args\":[\"KVContract:instantiate\"]}" \
    --peerAddresses "$2")"
  echo "$2 is ready $response"
}

instantiate "cli.org1.com" "peer0.org1.com:7060" &
instantiate "cli.org1.com" "peer1.org1.com:7061" &
instantiate "cli.org2.com" "peer0.org2.com:7070" &

wait
echo "All chaincodes ready!"
