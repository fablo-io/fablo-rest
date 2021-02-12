import express from "express";
import bodyParser from "body-parser";
import FabricCAServices from "fabric-ca-client";
import NetworkPool from "./NetworkPool";
import IdentityCache from "./IdentityCache";

const PORT = 8000;
const MSP_ID = "Org1MSP";
const AFFILIATION = "org1";

const app = express();
app.use(bodyParser.json());

app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const ca = new FabricCAServices("http://localhost:7031");

app.post("/user/register", async (req, res) => {
  const authToken = req.header("Authorization");
  if (!authToken) {
    return res.status(400).send({ message: "Missing authorization header" });
  }

  const caller = await IdentityCache.get(authToken);
  if (!caller) {
    return res.status(403).send({ message: "User with provided token is not enrolled" });
  }

  const id = req.body.id;
  const secret = req.body.secret;

  const registerRequest = {
    enrollmentID: id,
    enrollmentSecret: secret,
    role: "user",
    affiliation: AFFILIATION,
  };

  try {
    await ca.register(registerRequest, caller.user);
    return res.status(201).send({ message: "ok" });
  } catch (e) {
    return res.status(400).send({ message: e.message });
  }
});

app.post("/user/enroll", async (req, res) => {
  const id: string = req.body.id;
  const secret: string = req.body.secret;
  console.log(id, secret);
  try {
    const enrollResp = await ca.enroll({ enrollmentID: id, enrollmentSecret: secret });
    const token = await IdentityCache.put(id, enrollResp.key, enrollResp.certificate, MSP_ID);
    res.status(200).send({ token });
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
});

app.post("/chaincode", async (req, res) => {
  const authToken = req.header("Authorization");
  if (!authToken) {
    return res.status(400).send({ message: "Missing authorization header" });
  }

  const identity = await IdentityCache.get(authToken);
  if (!identity) {
    return res.status(403).send({ message: "User with provided token is not enrolled" });
  }

  const channelName = "my-channel1";
  const chaincodeName = "chaincode1";
  const methodName = "KVContract:put";
  const args = ["name", "Willy Wonka"];

  const network = await NetworkPool.connect(identity, channelName, MSP_ID);
  const contract = network.getContract(chaincodeName);

  const result = await contract.createTransaction(methodName).submit(...args);
  const string = result.toString();

  try {
    const response = JSON.parse(string);
    return res.status(200).send({ response });
  } catch (_e) {
    return res.status(200).send({ response: string });
  }
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
