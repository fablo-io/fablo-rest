import express from "express";
import bodyParser from "body-parser";
import FabricCAServices from "fabric-ca-client";
import { User } from "fabric-common";
import EnrolledUserCache from "./EnrolledUserCache";

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

// enroll - POSTem user/pass
// invoke/query standardowo

app.post("/user/register", async (req, res) => {
  const authToken = req.header("Authorization");
  if (!authToken) {
    return res.status(400).send({ message: "Missing authorization header" });
  }

  const caller = EnrolledUserCache.get(authToken);
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
  const id = req.body.id;
  const secret = req.body.secret;
  try {
    const enrollResp = await ca.enroll({ enrollmentID: id, enrollmentSecret: secret });
    const user = new User(id);
    await user.setEnrollment(enrollResp.key, enrollResp.certificate, MSP_ID);
    const token = EnrolledUserCache.put(user);
    res.status(200).send({ token });
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
