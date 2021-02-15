import fetch from "node-fetch";

const serverPath = "http://localhost:8000";

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
