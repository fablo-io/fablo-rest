import * as uuid from "uuid";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { callDefaultChaincode, generateEnrolledUser } from "./testUtils";

const invokePut = (token: string, arg1: string, arg2: string) =>
  callDefaultChaincode(token, "invoke", "KVContract:put", [arg1, arg2]);

const invokeGet = (token: string, arg1: string) => callDefaultChaincode(token, "invoke", "KVContract:get", [arg1]);

const invokeHistory = (token: string, arg1: string) =>
  callDefaultChaincode(token, "invoke", "KVContract:getHistory", [arg1]);

jest.setTimeout(10000);

describe("Invoke", () => {
  // todo: this test fails sometimes (to be resolved)
  it.skip("invoke concurrently (MVCC failure)", async () => {
    // Given
    const { token } = await generateEnrolledUser();
    const key = `key-${uuid.v1()}`;
    const initialInvokeResponse = await invokeGet(token, key); // why? to cache the discovery results
    expect(initialInvokeResponse).toEqual({ status: 200, body: { response: { error: "NOT_FOUND" } } });

    // When
    const invokeResponses = await Promise.all([
      invokePut(token, key, "Hello Alice"),
      invokeGet(token, key), // note: two puts succeeds regardless of arg2 value
      invokePut(token, key, "Hello Bob"),
      invokeGet(token, key), // note: two puts succeeds regardless of arg2 value
      invokePut(token, key, "Hello Carol"),
    ]);

    const historyResult = (await invokeHistory(token, key)).body.response as unknown[];

    // Then
    console.log(JSON.stringify(invokeResponses, undefined, 2));
    console.log(JSON.stringify(historyResult, undefined, 2));
    expect(invokeResponses.find((r) => r.status === 400)?.body).toEqual({ message: "MVCC_READ_CONFLICT" });
  });
});
