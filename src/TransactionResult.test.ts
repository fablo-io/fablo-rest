import TransactionResult from "./TransactionResult";

describe("TransactionResult.parse", () => {
  const helloMessage = "Hello from chaincode";
  const helloNumber = 42;
  const helloJson = { message: helloMessage, count: helloNumber };

  it("should parse a string", () => {
    // Given
    const response = Buffer.from(helloMessage);

    // When
    const parsed = TransactionResult.parse(response);

    // Then
    expect(parsed).toEqual({ status: 200, response: helloMessage });
  });

  it("should parse a valid JSON", () => {
    // Given
    const response = Buffer.from(JSON.stringify(helloJson));

    // When
    const parsed = TransactionResult.parse(response);

    // Then
    expect(parsed).toEqual({ status: 200, response: helloJson });
  });

  it("should parse a JSON that conforms recommended response shape", () => {
    // Given
    const status = 201;
    const response = Buffer.from(JSON.stringify({ status, payload: helloJson }));

    // When
    const parsed = TransactionResult.parse(response);

    // Then
    expect(parsed).toEqual({ status, response: helloJson });
  });

  it("should return valid response for empty result", () => {
    // Given
    const response = Buffer.alloc(0);

    // When
    const parsed = TransactionResult.parse(response);

    // Then
    expect(parsed).toEqual({ status: 200, response: "" });
  });
});
