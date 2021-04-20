// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { callDefaultChaincode, generateEnrolledUser } from "./testUtils";

jest.setTimeout(10000);

describe("Private data scenario", () => {
  const credentials = generateEnrolledUser();
  const collection = "private-collection";

  it("Put transient message to private data", async () => {
    // Given
    const { token } = await credentials;
    const method = "KVContract:putPrivateMessage";
    const transient = { message: "Top secret message" };

    // When
    const response = await callDefaultChaincode(token, "invoke", method, [collection], transient);

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: { response: { success: "OK" } },
      }),
    );
  });

  it("Read private data", async () => {
    // Given
    const { token } = await credentials;
    const method = "KVContract:getPrivateMessage";

    // When
    const response = await callDefaultChaincode(token, "query", method, [collection]);

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: { response: { success: "Top secret message" } },
      }),
    );
  });

  it("Verify private data", async () => {
    const { token } = await credentials;
    const method = "KVContract:verifyPrivateMessage";
    const transient1 = { message: "Top secret message" };
    const transient2 = { message: "Invalid secret message" };

    // When
    const response1 = await callDefaultChaincode(token, "query", method, [collection], transient1);
    const response2 = await callDefaultChaincode(token, "query", method, [collection], transient2);

    // Then
    expect(response1).toEqual(
      expect.objectContaining({
        status: 200,
        body: { response: { success: "OK" } },
      }),
    );
    expect(response2).toEqual(
      expect.objectContaining({
        status: 200,
        body: { response: { error: "VERIFICATION_FAILED" } },
      }),
    );
  });
});
