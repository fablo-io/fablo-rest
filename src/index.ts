import express from "express";
import bodyParser from "body-parser";
import FabricCAServices from "fabric-ca-client";
import NetworkPool from "./NetworkPool";
import IdentityCache from "./IdentityCache";
import { AFFILIATION, FABRIC_CA_URL, MSP_ID, PORT } from "./config";
import Authorization from "./Authorization";
import ChaincodeRequest from "./ChaincodeRequest";

const app = express();
app.use(bodyParser.json());

app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const ca = new FabricCAServices(FABRIC_CA_URL);

app.post("/user/register", async (req, res) => {
  const caller = await Authorization.forceAuthorization(req, res);

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

  try {
    const enrollResp = await ca.enroll({ enrollmentID: id, enrollmentSecret: secret });
    const token = await IdentityCache.put(id, enrollResp.key, enrollResp.certificate, MSP_ID);
    res.status(200).send({ token });
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
});

const TransactionResult = {
  parse: (b: Buffer): string | Record<string, any> => {
    try {
      return JSON.parse(b.toString());
    } catch (_e) {
      return b.toString();
    }
  },
};

app.post("/invoke/:channelName/:chaincodeName", async (req, res) => {
  const identity = await Authorization.forceAuthorization(req, res);
  const chaincodeReq = ChaincodeRequest.getValid(req, res);
  const network = await NetworkPool.connect(identity, chaincodeReq.channelName);

  const transactionResult = await network
    .getContract(chaincodeReq.chaincodeName)
    .submitTransaction(chaincodeReq.method, ...chaincodeReq.args);

  res.status(200).send({ response: TransactionResult.parse(transactionResult) });
});

app.post("/query/:channelName/:chaincodeName", async (req, res) => {
  const identity = await Authorization.forceAuthorization(req, res);
  const chaincodeReq = ChaincodeRequest.getValid(req, res);
  const network = await NetworkPool.connect(identity, chaincodeReq.channelName);

  const transactionResult = await network
    .getContract(chaincodeReq.chaincodeName)
    .evaluateTransaction(chaincodeReq.method, ...chaincodeReq.args);

  res.status(200).send({ response: TransactionResult.parse(transactionResult) });
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
