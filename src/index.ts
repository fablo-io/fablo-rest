import express from "express";
import bodyParser from "body-parser";
import FabricCAServices from "fabric-ca-client";
import EnrolledUserCache from "./EnrolledUserCache";
import { Gateway } from "fabric-network";
import { Client } from "fabric-common";

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

  const caller = await EnrolledUserCache.getUser(authToken);
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
    await ca.register(registerRequest, caller);
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
    const token = await EnrolledUserCache.put(id, enrollResp.key, enrollResp.certificate, MSP_ID);
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

  const identity = await EnrolledUserCache.getIdentity(authToken);
  const user = await EnrolledUserCache.getUser(authToken);
  if (!identity || !user) {
    return res.status(403).send({ message: "User with provided token is not enrolled" });
  }

  const client = Client.newClient(`Fabrica-REST-${MSP_ID}`);
  const channel = client.getChannel("my-channel1");

  const endpoint = client.newEndpoint({ url: "grpc://localhost:7060" });
  const discoverer = client.newDiscoverer(`Fabrica-REST-discoverer-${MSP_ID}`, MSP_ID);
  await discoverer.connect(endpoint);

  // use the endorsement to build the discovery request
  const chaincodeName = "chaincode1";
  const identityContext = client.newIdentityContext(user);
  const endorsement = channel.newEndorsement(chaincodeName);
  const discovery = channel.newDiscoveryService(`Fabrica-REST-discovery-service-${MSP_ID}`);
  discovery.build(identityContext, { endorsement: endorsement });
  discovery.sign(identityContext);

  // discovery results will be based on the chaincode of the endorsement
  await discovery.send({ targets: [discoverer], asLocalhost: true });
  // console.log("\nDiscovery test 1 results :: " + JSON.stringify(discovery_results));

  const gateway = new Gateway();
  await gateway.connect(client, { identity, discovery: { asLocalhost: true, enabled: true } });
  const network = await gateway.getNetwork("my-channel1");
  const contract = network.getContract(chaincodeName);

  const result = await contract.createTransaction("KVContract:put").submit("name", "Willy Wonka");
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
