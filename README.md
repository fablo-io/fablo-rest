# Fablo REST

[![Test](https://github.com/softwaremill/fablo-rest/actions/workflows/test.yml/badge.svg)](https://github.com/softwaremill/fablo-rest/actions/workflows/test.yml)

A simple REST API interface for Hyperledger Fabric blockchain network. Supported features:

* enroll, reenroll, register and list identities,
* discover the network for a given channel,
* query and invoke chaincode (with transient parameters support).

Fablo REST should work with any available Hyperledger Fabric network, however it is also integrated
with [Fablo](https://github.com/softwaremill/fablo), a simple tool to generate the Hyperledger Fabric blockchain network
and run it on Docker. It is distributed as the Docker
image: [`softwaremill/fablo-rest`](https://hub.docker.com/r/softwaremill/fablo-rest).

## Running and configuration

### Running example 1

Use Fablo REST in Docker compose file within the same Docker network as Hyperledger Fabric:

```yaml
  fablo-rest.org1.com:
    image: softwaremill/fablo-rest:0.1.0
    environment:
      - PORT=8000
      - AFFILIATION=Org1
      - MSP_ID=Org1MSP
      - FABRIC_CA_URL=http://ca.org1.com:7054
      - FABRIC_CA_NAME=ca.org1.com
      - AS_LOCALHOST=false
      - DISCOVERY_URLS=grpc://peer0.org1.com:7060
      - HFC_LOGGING={"debug":"console"}
    ports:
      - 8800:8000
    depends_on:
      - ca.org1.com
      - peer0.org1.com
```

### Running example 2

Start Fablo REST as a Docker container connected to some Hyperedger Fabric network that has been started
on `localhost` (+ use TLS):

```bash
docker run \
  -e AFFILIATION="Org2" \
  -e MSP_ID="Org2MSP" \
  -e FABRIC_CA_URL="http://localhost:7054" \
  -e FABRIC_CA_NAME="ca.org2.com" \
  -e DISCOVERY_URLS="grpcs://localhost:7070,grpcs://localhost:7071" \
  -e DISCOVERY_SSL_TARGET_NAME_OVERRIDES="peer0.org2.com,peer1.org2.com" \
  -e DISCOVERY_TLS_CA_CERT_FILES="/peer-crypto/org2.com/peers/peer0.org2.com/tls/ca.crt,/peer-crypto/org2.com/peers/peer1.org2.com/tls/ca.crt" \
  -e AS_LOCALHOST="true" \
  -p "8000:8000" \
  -v "/some/path/fabric-config/crypto-config/peerOrganizations:/peer-crypto" \
  -d \
  --rm \
  softwaremill/fablo-rest:0.1.0
```

### Environment variables

* `PORT` - the port under with Fablo REST will be available (default: `8000`).
* `AFFILIATION` - an affiliation that should be used during user registration (default: `org1`).
* `MSP_ID` - a Membership Service Provider ID for the organization that runs the Fablo REST instance (
  default: `Org1MSP`).
* `FABRIC_CA_URL` - an URL to Certificate Authority (CA) instance (default: `http://localhost:7031`).
* `FABRIC_CA_NAME` - the name of CA used by this Fablo REST instance (default: `ca.org1.com`).
* `AS_LOCALHOST` - whether the service discovery should convert discovered host names to `localhost`. The variable
  should be set to `true` if the network starts with Docker compose (default: `true`).
* `DISCOVERY_URLS` - a comma-separated list of Anchor Peer URLs to be used as service discovery endpoins (
  default: `grpc://localhost:7060`).
* `DISCOVERY_SSL_TARGET_NAME_OVERRIDES` - if `AS_LOCALHOST` variable is set to `true` and the Fabric network uses TLS.
  The variable should provide a comma-separated list of anchor peer names for each value from `DISCOVERY_URLS` variable.
  See also `[ConnectOptions](https://hyperledger.github.io/fabric-sdk-node/release-2.2/global.html#ConnectOptions)` from
  Fabric Node.js SDK. By default the variable is empty.
* `DISCOVERY_TLS_CA_CERT_FILES` - if the Fabric network uses TLS, the variable should provide a comma separated paths to
  PEM certificates of Anchor Peers specified in `DISCOVERY_URLS` variable. Paths should be available for Fablo REST
  container, so don't forget to mount required volumes. By default the variable is empty.
* `HFC_LOGGING` - contains a stringified JSON that describes the Logging levels and targets for both Fablo REST and
  Node.js SDK that Fablo REST uses,
  see [some examples](https://hyperledger.github.io/fabric-sdk-node/release-1.4/tutorial-logging.html).

## Endpoints

### POST /user/enroll

Enrolls an identity in the CA and returns Fablo REST authorization token.

#### Headers

```
Content-Type: application/json
```

#### Body

```json
{
  "id": "<user-id>",
  "secret": "<user-secret>"
}
```

#### Response body

```json
{
  "token": "<authorization-token>"
}
```

### POST /user/reenroll

Reenrolls an identity in the CA, returns new Fablo REST authorization token and invalidates the previous one.

#### Headers

```
Content-Type: application/json
Authorization: Bearer <authorization-token>
```

#### Response body

```json
{
  "token": "<new-authorization-token>"
}
```

### POST /user/register

Registers an identity in the CA. Requires an admin user.

#### Headers

```
Content-Type: application/json
Authorization: Bearer <authorization-token>
```

#### Body

```json
{
  "id": "<user-id>",
  "secret": "<user-secret>"
}
```

#### Response body

```json
{
  "message": "ok"
}
```

### GET /user/identities

Returns a list of identities saved in the CA. Requires an admin user.

#### Headers

```
Content-Type: application/json
Authorization: Bearer <authorization-token>
```

#### Response body

```json
{
  "response": {
    "caname": "<ca-name>",
    "identities": [
      {
        "affiliation": "<user-affiliation>",
        "id": "<user-id>",
        "type": "<user-type>",
        "attrs": "<an-array-of-user-atrributes>",
        "max_enrollments": "<number>"
      },
      ...
    ]
  }
}
```

### POST /discover/:channel

Runs service discovery for given `channel` and returns the discovery results. It uses kind of "round robin" strategy for
the discovery. If a discovery peer is not available for discovery for the given channel, it tries another one.

#### Headers

```
Content-Type: application/json
Authorization: Bearer <authorization-token>
```

#### Response body

JSON with discovery results, containing MSPs, orderers and peers by organizations. This is quite a complex object, see
the example in the [discovery e2e tests](https://github.com/softwaremill/fablo-rest/blob/main/e2e/discover.test.ts).

<h3>POST /invoke/:channel/:chaincode<br/>POST /query/:channel/:chaincode</h3>

Invokes or queries the `chaincode` on a given `channel`. It uses `MSPID_SCOPE_ALLFORTX` strategy for invoke
and `MSPID_SCOPE_ROUND_ROBIN` strategy for query.

#### Headers

```
Content-Type: application/json
Authorization: Bearer <authorization-token>
```

#### Body

```json
{
  "method": "<ContractClass:method>",
  "args": [
    "arg1",
    "arg2",
    ...
  ],
  "transient": {
    "<key>": "<value>",
    ...
  }
}
```

Field `transient` is optional and it contains an object with string keys and string values. You don't need to encode the
stings in Base64 format, Fablo REST will do it for you.

#### Response body

A response from the chaincode. It will contain a JSON object, string or another value returned by the chaincode:

```json
{
  "response": <value-returned-by-chaincode>
}
```

Besides, you may implement your chaincode to return the following object:

```json
{
  "status": <number>,
  "response": <object-string-or-other-value>
}
```

In this case Fablo REST will use the `status` as HTTP status code and a `response` as a `response` inside the response
body.

### Error responses

In case of errors along with appropriate HTTP response code, Fablo REST returns the following
body: `{ "message": "<error-message>" }`. The error message may be provided by Fablo REST or just passed from Fabric CA
or other nodes in the network.

### Sample usage

See more usage examples in our [E2E tests](https://github.com/softwaremill/fablo-rest/tree/main/e2e).
