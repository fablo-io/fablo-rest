import express from "express";
import IdentityCache, { CachedIdentity } from "./IdentityCache";

type IdentityWithToken = CachedIdentity & { token: string };

const getFromToken = async (request: express.Request, response: express.Response): Promise<IdentityWithToken> => {
  const authToken = request.token;
  if (!authToken) {
    const message = "Missing authorization header";
    response.status(400).send({ message });
    throw new Error(message);
  }

  const identity = await IdentityCache.get(authToken);
  if (!identity) {
    const message = "User with provided token is not enrolled";
    response.status(403).send({ message });
    throw new Error(message);
  }

  return { ...identity, token: authToken };
};

export default {
  getFromToken,
};
