// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { authorizationHeader, generateEnrolledUser, post } from "./testUtils";
import config from "../src/config";

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
                    host: "orderer0.group1.root.com",
                    name: "orderer0.group1.root.com:7030",
                    port: 7030,
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
                    endpoint: "peer0.org1.com:7041",
                    ledgerHeight: { high: 0, low: expect.anything(), unsigned: true },
                    mspid: "Org1MSP",
                    name: "peer0.org1.com:7041",
                  },
                  {
                    chaincodes: [
                      { name: "chaincode1", version: "1" },
                      { name: "_lifecycle", version: "1" },
                    ],
                    endpoint: "peer1.org1.com:7042",
                    ledgerHeight: { high: 0, low: expect.anything(), unsigned: true },
                    mspid: "Org1MSP",
                    name: "peer1.org1.com:7042",
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
                    endpoint: "peer0.org2.com:7061",
                    ledgerHeight: { high: 0, low: expect.anything(), unsigned: true },
                    mspid: "Org2MSP",
                    name: "peer0.org2.com:7061",
                  },
                  {
                    chaincodes: [
                      { name: "chaincode1", version: "1" },
                      { name: "_lifecycle", version: "1" },
                    ],
                    endpoint: "peer1.org2.com:7062",
                    ledgerHeight: { high: 0, low: expect.anything(), unsigned: true },
                    mspid: "Org2MSP",
                    name: "peer1.org2.com:7062",
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
    const discoveryEndpoints = config.discovererConfigs.map((d) => d.url);
    expect(discoveryEndpoints).toEqual([
      "grpcs://peer0.org2.com:7061", // has access to my-channel1
      "grpcs://wrong.org2.com:9999", // unavailable
      "grpcs://peer1.org2.com:7062", // has access to my-channel1 and my-channel2
    ]);

    const { token } = await credentials;
    const easyChannel = "my-channel1"; // first discoverer will return the results
    const hardChannel = "my-channel2"; // third disciverer will return results
    const errorChannel = "my-channel-non-existing"; // no disciverer will return results

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
      "peer0.org1.com:7041",
      "peer0.org2.com:7061",
      "peer1.org1.com:7042",
      "peer1.org2.com:7062",
    ]);

    expect(hardResponse).toEqual(expect.objectContaining({ status: 200, body: expect.anything() }));
    expect(getEndpoints(hardResponse)).toEqual(["peer1.org1.com:7042", "peer1.org2.com:7062"]);

    expect(errorResponse).toEqual({
      status: 500,
      body: {
        message: `No available discoverers for channel ${errorChannel}`,
      },
    });
  });
});
