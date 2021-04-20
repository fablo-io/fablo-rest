import express from "express";
import bodyParser from "body-parser";
import FabricCAServices from "fabric-ca-client";
import NetworkPool from "./NetworkPool";
import IdentityCache from "./IdentityCache";
import config from "./config";
import Authorization from "./Authorization";
import ChaincodeRequest from "./ChaincodeRequest";
import matches from "ts-matches";

const app = express();
app.use(bodyParser.json());

app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const ca = new FabricCAServices(config.FABRIC_CA_URL);

app.post("/user/enroll", async (req, res) => {
  const id: string = req.body.id;
  const secret: string = req.body.secret;
  console.log("Enrolling as", id);

  try {
    const enrollResp = await ca.enroll({ enrollmentID: id, enrollmentSecret: secret });
    const token = await IdentityCache.put(id, enrollResp.key, enrollResp.certificate, config.MSP_ID);
    res.status(200).send({ token });
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
});

app.post("/user/register", async (req, res) => {
  const caller = await Authorization.getFromToken(req, res);

  const id = req.body.id;
  const secret = req.body.secret;
  console.log("Registering", id, "by", caller.user.getName());

  const registerRequest = {
    enrollmentID: id,
    enrollmentSecret: secret,
    affiliation: config.AFFILIATION,
    maxEnrollments: 0,
  };

  try {
    await ca.register(registerRequest, caller.user);
    return res.status(201).send({ message: "ok" });
  } catch (e) {
    return res.status(400).send({ message: e.message });
  }
});

const payloadWithStatusShape = matches.shape({ status: matches.natural, payload: matches.any });

const TransactionResult = {
  parse: (b: Buffer): { status: number; response: any } => {
    try {
      const payload: Record<string, any> = JSON.parse(b.toString());
      if (payloadWithStatusShape.test(payload)) {
        return { status: payload.status, response: payload.payload };
      } else {
        return { status: 200, response: payload };
      }
    } catch (_e) {
      return { status: 200, response: b.toString() };
    }
  },
};

app.post("/invoke/:channelName/:chaincodeName", async (req, res) => {
  const identity = await Authorization.getFromToken(req, res);
  const chaincodeReq = ChaincodeRequest.getValid(req, res);
  const network = await NetworkPool.connect(identity, chaincodeReq.channelName);
  console.log("Invoking chaincode", chaincodeReq.method, "by", identity.user.getName());

  try {
    const transactionResult = await network
      .getContract(chaincodeReq.chaincodeName)
      .createTransaction(chaincodeReq.method)
      .setTransient(chaincodeReq.transient)
      .submit(...chaincodeReq.args);

    const { status, response } = TransactionResult.parse(transactionResult);
    res.status(status).send({ response });
  } catch (e) {
    res.status(400).send({ message: e.transactionCode ?? e.message });
  }
});

app.post("/query/:channelName/:chaincodeName", async (req, res) => {
  const identity = await Authorization.getFromToken(req, res);
  const chaincodeReq = ChaincodeRequest.getValid(req, res);
  const network = await NetworkPool.connect(identity, chaincodeReq.channelName);
  console.log("Querying chaincode", chaincodeReq.method, "by", identity.user.getName());

  try {
    const transactionResult = await network
      .getContract(chaincodeReq.chaincodeName)
      .createTransaction(chaincodeReq.method)
      .setTransient(chaincodeReq.transient)
      .evaluate(...chaincodeReq.args);

    const { status, response } = TransactionResult.parse(transactionResult);
    res.status(status).send({ response });
  } catch (e) {
    res.status(400).send({ message: e.transactionCode ?? e.message });
  }
});

app.listen(config.PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${config.PORT} for organization ${config.MSP_ID}`);
});
