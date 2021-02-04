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
      return {};
    }),
  }));

describe("Simple invoke flow", () => {
  let adminEnrollToken: string;
  let userEnrollToken: string;

  const adminId = "admin";
  const adminSecret = "adminpw";
  const userId = uuid.v1();
  const userSecret = "secrett123";

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
    console.log(userEnrollToken);
  });
});

it("should allow to invoke chaincode", async () => {
  // // Given
  // const channel = "";
  // const chaincode = "";
  //
  // // When
  // const response = await post("chaincode/");
});
