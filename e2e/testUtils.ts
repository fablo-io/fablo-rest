import fetch from "node-fetch";
import * as uuid from "uuid";

const port = process.env.PORT ?? "8000";
const serverPath = `http://localhost:${port}`;

export const post = (
  path: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<{ body: any; status: number }> =>
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

const adminCredentials = { id: "admin", secret: "adminpw" };

const enroll = async (credentials: { id: string; secret: string }): Promise<{ token: string }> => {
  const response = await post("/user/enroll", credentials);

  expect(response).toEqual(
    expect.objectContaining({
      status: 200,
      body: { token: expect.stringMatching(/.*/) },
    }),
  );

  const token = response.body.token as string;
  return { token };
};

const enrollAdmin = async (): Promise<{ token: string }> => enroll(adminCredentials);

export const generateRegisteredUser = async (): Promise<{ id: string; secret: string }> => {
  const credentials = { id: `user-${uuid.v1()}`, secret: `secret-${uuid.v1()}` };
  const enrolledAdmin = await enrollAdmin();
  const response = await post("/user/register", credentials, { Authorization: enrolledAdmin.token });

  expect(response).toEqual(
    expect.objectContaining({
      status: 201,
      body: { message: "ok" },
    }),
  );

  return credentials;
};

export const generateEnrolledUser = async (): Promise<{ id: string; token: string }> => {
  const credentials = await generateRegisteredUser();
  const { token } = await enroll(credentials);
  return { id: credentials.id, token };
};
