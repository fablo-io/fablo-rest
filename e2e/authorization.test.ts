import * as uuid from "uuid";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { post, generateRegisteredUser, generateEnrolledUser } from "./testUtils";

describe("Enrollment", () => {
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

  it("should allow to enroll concurrently (and allow to enroll twice)", async () => {
    // Given
    const userCredentials = await generateRegisteredUser();

    // When
    const [response1, response2] = await Promise.all([
      post("/user/enroll", userCredentials),
      post("/user/enroll", userCredentials),
    ]);

    // Then
    const responseMatcher = expect.objectContaining({
      status: 200,
      body: { token: expect.stringMatching(/.*/) },
    });
    expect(response1).toEqual(responseMatcher);
    expect(response2).not.toEqual(response1);
    expect(response2).toEqual(responseMatcher);
  });
});

describe("Registration", () => {
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

  it("should not allow to register user by non-admin", async () => {
    // Given
    const { token } = await generateEnrolledUser();

    // When
    const response = await post("/user/register", { id: uuid.v1(), secret: "aaabbbccc" }, { Authorization: token });

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 400,
        body: { message: expect.stringContaining("Failed to verify if user can act on type \\'user\\'") },
      }),
    );
  });
});
