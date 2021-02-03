import * as uuid from "uuid";
import fetch from "node-fetch";

const serverPath = "http://localhost:8000";

const post = (path: string, body: Record<string, unknown>) =>
  fetch(`${serverPath}${path}`, {
    method: "post",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (resp) => ({
    status: resp.status,
    body: await resp.json().catch(async (e) => {
      console.error(e);
      return {};
    }),
  }));

it("should allow to invoke chaincode", async () => {
  // Given
  const userId = uuid.v1();
  const secret = "secretttt";
  const registerResponse = await post("/admin/user/register", { id: userId, secret });
  expect(registerResponse).toEqual(
    expect.objectContaining({
      status: 201,
      body: { message: "ok" },
    }),
  );

  const enrollmentResponse = await post("/user/enroll", { id: userId, secret });
  expect(enrollmentResponse).toEqual(
    expect.objectContaining({
      status: 200,
      body: {
        certificate: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
        key: expect.stringContaining("-----BEGIN PRIVATE KEY-----"),
      },
    }),
  );

  // TODO jak to powinno działać - node-cache + pobierać jakiś uuid/token do wywołania chaincode (uuid to klucz w cache)
});
