import * as uuid from "uuid";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { post } from "./testUtils";

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
