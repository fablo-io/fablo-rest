import express from "express";
import matches from "ts-matches";

interface ChaincodeRequestT {
  channelName: string;
  chaincodeName: string;
  method: string;
  args: string[];
}

const getValidOrError = (request: express.Request): { error: string } | ChaincodeRequestT => {
  const channelName: string | undefined = request.params.channelName;
  if (!channelName) return { error: "Missing channel name in path" };

  const chaincodeName: string | undefined = request.params.chaincodeName;
  if (!chaincodeName) return { error: "Missing chaincode name in path" };

  const method: string | undefined = request.body.method;
  if (!method) return { error: "Missing chaincode method in request body" };

  const argsMatcher = matches.arrayOf(matches.string);
  if (!argsMatcher.test(request.body.args)) return { error: "Invalid chaincode args. It must be an array of strings" };
  const args: string[] = request.body.args;

  return {
    channelName,
    chaincodeName,
    method,
    args,
  };
};

const isError = (reqOrError: { error: string } | ChaincodeRequestT): reqOrError is { error: string } =>
  "error" in reqOrError;

const getValid = (request: express.Request, response: express.Response): ChaincodeRequestT => {
  const chaincodeReqOrError = getValidOrError(request);

  if (isError(chaincodeReqOrError)) {
    response.status(400).send({ mesage: chaincodeReqOrError.error });
    throw new Error(chaincodeReqOrError.error);
  }

  return chaincodeReqOrError;
};

export default {
  getValid,
};
