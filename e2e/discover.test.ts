// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { authorizationHeader, generateEnrolledUser, post } from "./testUtils";

jest.setTimeout(10000);

describe("Discover scenario", () => {
  const credentials = generateEnrolledUser();

  it("Get discovery results for channel", async () => {
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
                peers: [
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
                ],
              },
              Org2MSP: {
                peers: [
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
                ],
              },
            },
            timestamp: expect.anything(),
          },
        },
      }),
    );
  });
});
