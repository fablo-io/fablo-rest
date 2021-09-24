import * as uuid from "uuid";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { authorizationHeader, post } from "./testUtils";

jest.setTimeout(10000);

describe("Happy path", () => {
  let adminEnrollToken: string;
  let userEnrollToken: string;

  const adminCredentials = { id: "admin", secret: "adminpw" };
  const userCredentials = { id: uuid.v1(), secret: "secrett123" };

  const chaincodeArg1 = uuid.v1();

  it("should enroll admin", async () => {
    // When
    const response = await post("/user/enroll", adminCredentials);

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: { token: expect.stringMatching(/.*/) },
      }),
    );

    adminEnrollToken = response.body.token;
  });

  it("should register new user", async () => {
    // When
    const response = await post("/user/register", userCredentials, authorizationHeader(adminEnrollToken));

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 201,
        body: { message: "ok" },
      }),
    );
  });

  it("should enroll user", async () => {
    // When
    const response = await post("/user/enroll", userCredentials);

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: { token: expect.stringMatching(/.*/) },
      }),
    );

    userEnrollToken = response.body.token;
  });

  it("should allow to invoke chaincode", async () => {
    // Given
    const channelName = "my-channel1";
    const chaincodeName = "chaincode1";
    const method = "KVContract:put";
    const args = [chaincodeArg1, "Willy Wonka"];

    // When
    const response = await post(
      `/invoke/${channelName}/${chaincodeName}`,
      { method, args },
      authorizationHeader(userEnrollToken),
    );

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: { response: { success: "OK" } },
      }),
    );
  });

  it("should allow to query chaincode", async () => {
    // Given
    const channelName = "my-channel1";
    const chaincodeName = "chaincode1";
    const method = "KVContract:get";
    const args = [chaincodeArg1];

    // When
    const response = await post(
      `/query/${channelName}/${chaincodeName}`,
      { method, args },
      authorizationHeader(userEnrollToken),
    );

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: { response: { success: "Willy Wonka" } },
      }),
    );
  });
});
