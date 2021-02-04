import * as uuid from "uuid";
import EnrolledUserCache from "./EnrolledUserCache";
import { User } from "fabric-client";

it("should put and get user", () => {
  // Given
  const user = new User(uuid.v1());

  // When
  const token = EnrolledUserCache.put(user);

  // Then
  expect(EnrolledUserCache.get(token)).toEqual(user);
});
