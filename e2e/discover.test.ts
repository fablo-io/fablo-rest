// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { authorizationHeader, generateEnrolledUser, post } from "./testUtils";

jest.setTimeout(10000);

describe("Discover scenario", () => {
  const credentials = generateEnrolledUser();

  it("should get discovery results for channel", async () => {
    // Given
    const { token } = await credentials;
    const channelName = "my-channel1";

    // When
    const response = await post(`/discover/${channelName}`, {}, authorizationHeader(token));

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: {
          response: {
            msps: {
              OrdererMSP: {
                admins: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
                id: "OrdererMSP",
                intermediateCerts: "",
                name: "OrdererMSP",
                organizationalUnitIdentifiers: [],
                rootCerts: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
                tlsIntermediateCerts: "",
                tlsRootCerts: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
              },
              Org1MSP: {
                admins: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
                id: "Org1MSP",
                intermediateCerts: "",
                name: "Org1MSP",
                organizationalUnitIdentifiers: [],
                rootCerts: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
                tlsIntermediateCerts: "",
                tlsRootCerts: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
              },
              Org2MSP: {
                admins: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
                id: "Org2MSP",
                intermediateCerts: "",
                name: "Org2MSP",
                organizationalUnitIdentifiers: [],
                rootCerts: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
                tlsIntermediateCerts: "",
                tlsRootCerts: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
              },
            },
            orderers: {
              OrdererMSP: {
                endpoints: [
                  {
                    host: "orderer0.root.com",
                    name: "orderer0.root.com:7050",
                    port: 7050,
                  },
                ],
              },
            },
            peers_by_org: {
              Org1MSP: {
                peers: expect.arrayContaining([
                  {
                    chaincodes: [
                      { name: "chaincode1", version: "1" },
                      { name: "_lifecycle", version: "1" },
                    ],
                    endpoint: "peer0.org1.com:7060",
                    ledgerHeight: { high: 0, low: expect.anything(), unsigned: true },
                    mspid: "Org1MSP",
                    name: "peer0.org1.com:7060",
                  },
                  {
                    chaincodes: [
                      { name: "chaincode1", version: "1" },
                      { name: "_lifecycle", version: "1" },
                    ],
                    endpoint: "peer1.org1.com:7061",
                    ledgerHeight: { high: 0, low: expect.anything(), unsigned: true },
                    mspid: "Org1MSP",
                    name: "peer1.org1.com:7061",
                  },
                ]),
              },
              Org2MSP: {
                peers: expect.arrayContaining([
                  {
                    chaincodes: [
                      { name: "chaincode1", version: "1" },
                      { name: "_lifecycle", version: "1" },
                    ],
                    endpoint: "peer0.org2.com:7070",
                    ledgerHeight: { high: 0, low: expect.anything(), unsigned: true },
                    mspid: "Org2MSP",
                    name: "peer0.org2.com:7070",
                  },
                  {
                    chaincodes: [
                      { name: "chaincode1", version: "1" },
                      { name: "_lifecycle", version: "1" },
                    ],
                    endpoint: "peer1.org2.com:7071",
                    ledgerHeight: { high: 0, low: expect.anything(), unsigned: true },
                    mspid: "Org2MSP",
                    name: "peer1.org2.com:7071",
                  },
                ]),
              },
            },
            timestamp: expect.anything(),
          },
        },
      }),
    );
  });

  it("should get discovery results for both channels", async () => {
    /* Rationale: Fabric's DiscoveryService uses first endpoint and fails if, for instance,
     * given peer did not join the channel. That's why we use a kind of round robin strategy
     * for service discovery. If one of the peers fail, we did not return error, but query
     * another one. And this is the thing the test aims to verify.
     */
    // Given
    const { token } = await credentials;
    const easyChannel = "my-channel1";
    const hardChannel = "my-channel2";
    const errorChannel = "my-channel-non-existing";

    const getEndpoints = (response: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const fromOrg1 = response.body.response.peers_by_org.Org1MSP.peers.map((p) => p.endpoint);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const fromOrg2 = response.body.response.peers_by_org.Org2MSP.peers.map((p) => p.endpoint);
      return fromOrg1.concat(fromOrg2).sort();
    };

    // When
    const easyResponse = await post(`/discover/${easyChannel}`, {}, authorizationHeader(token));
    const hardResponse = await post(`/discover/${hardChannel}`, {}, authorizationHeader(token));
    const errorResponse = await post(`/discover/${errorChannel}`, {}, authorizationHeader(token));

    // Then
    expect(easyResponse).toEqual(expect.objectContaining({ status: 200, body: expect.anything() }));
    expect(getEndpoints(easyResponse)).toEqual([
      "peer0.org1.com:7060",
      "peer0.org2.com:7070",
      "peer1.org1.com:7061",
      "peer1.org2.com:7071",
    ]);

    expect(hardResponse).toEqual(expect.objectContaining({ status: 200, body: expect.anything() }));
    expect(getEndpoints(hardResponse)).toEqual(["peer1.org1.com:7061", "peer1.org2.com:7071"]);

    expect(errorResponse).toEqual({
      status: 500,
      body: {
        message: `No available discoverers for channel ${errorChannel}`,
      },
    });
  });
});
