import * as uuid from "uuid";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { post, generateRegisteredUser, generateEnrolledUser, enrollAdmin, get, authorizationHeader } from "./testUtils";
import config from "../src/config";

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

  it("should allow to reenroll", async () => {
    // Given
    const { token } = await generateEnrolledUser();

    // When
    const response = await post("/user/reenroll", {}, authorizationHeader(token));

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: { token: expect.stringMatching(/.*/) },
      }),
    );
  });

  it("should allow to perform user action by reenrolled user", async () => {
    // given
    const { token } = await enrollAdmin();
    const reenrollResponse = await post("/user/reenroll", {}, authorizationHeader(token));

    // when
    const response = await post(
      "/user/register",
      { id: uuid.v1(), secret: "aaabbbccc" },
      authorizationHeader(reenrollResponse.body.token),
    );

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 201,
        body: { message: "ok" },
      }),
    );
  });

  it("should not allow to perform action with old token invalidated by reenrollment", async () => {
    // given
    const { token } = await enrollAdmin();
    await post("/user/reenroll", {}, authorizationHeader(token));

    // when
    const response = await post("/user/register", { id: uuid.v1(), secret: "aaabbbccc" }, authorizationHeader(token));

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 403,
        body: { message: "User with provided token is not enrolled" },
      }),
    );
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
      authorizationHeader("invalid-token"),
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
    const response = await post("/user/register", { id: uuid.v1(), secret: "aaabbbccc" }, authorizationHeader(token));

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 400,
        body: {
          message: expect.stringContaining(
            "fabric-ca request register failed with errors [[ { code: 71, message: 'Authorization failure' } ]]",
          ),
        },
      }),
    );
  });
});

describe("Identities", () => {
  it("should list identities for an admin", async () => {
    // Given
    const { token } = await enrollAdmin();
    const user = await generateRegisteredUser();

    // When
    const response = await get("/user/identities", authorizationHeader(token));

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: {
          response: {
            caname: config.FABRIC_CA_NAME,
            identities: expect.anything(),
          },
        },
      }),
    );

    expect(response.body.response.identities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "admin", type: "client" }),
        expect.objectContaining({ id: user.id, type: "client" }),
      ]),
    );
  });

  it("should fail to list identities for a non-admin user", async () => {
    // Given
    const { token } = await generateEnrolledUser();

    // When
    const response = await get("/user/identities", authorizationHeader(token));

    // Then
    expect(response).toEqual(
      expect.objectContaining({
        status: 400,
        body: { message: expect.stringContaining("Authorization failure") },
      }),
    );
  });
});
