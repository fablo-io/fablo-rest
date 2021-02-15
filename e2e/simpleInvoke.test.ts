import * as uuid from "uuid";
import fetch from "node-fetch";

const serverPath = "http://localhost:8000";

const post = (path: string, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  fetch(`${serverPath}${path}`, {
    method: "post",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }).then(async (resp) => ({
    status: resp.status,
    body: await resp.json().catch(async (e) => {
      console.error(e);
      console.log(resp);
      return {};
    }),
  }));

describe("Invalid authorization", () => {
  it("fail to enroll admin in case of invalid credentials", async () => {
    // When
    const response = await post("/user/enroll", { id: "not-present", secret: "invalid" });

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 400,
        body: {
          // default message from Hyperledger Fabric CA
          message: "fabric-ca request enroll failed with errors [[ { code: 20, message: 'Authentication failure' } ]]",
        },
      }),
    );
  });

  it("should fail to register user in case of missing Authorization header", async () => {
    // When
    const response = await post("/user/register", { id: uuid.v1(), secret: "aaabbbccc" });

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 400,
        body: { message: "Missing authorization header" },
      }),
    );
  });

  it("should fail to register user in case of invalid Authorization header", async () => {
    // When
    const response = await post(
      "/user/register",
      { id: uuid.v1(), secret: "aaabbbccc" },
      { Authorization: "invalid-header-value" },
    );

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 403,
        body: { message: "User with provided token is not enrolled" },
      }),
    );
  });
});

describe("Simple invoke flow", () => {
  let adminEnrollToken: string;
  let userEnrollToken: string;

  const adminId = "admin";
  const adminSecret = "adminpw";
  const userId = uuid.v1();
  const userSecret = "secrett123";

  const chaincodeArg1 = uuid.v1();

  it("should enroll admin", async () => {
    // When
    const response = await post("/user/enroll", { id: adminId, secret: adminSecret });

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
    const response = await post(
      "/user/register",
      { id: userId, secret: userSecret },
      { Authorization: adminEnrollToken },
    );

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
    const response = await post("/user/enroll", { id: userId, secret: userSecret });

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
      { Authorization: userEnrollToken },
    );

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: { response: { success: "OK" } },
      }),
    );
  });
});
