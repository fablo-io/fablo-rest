import express from "express";
import bodyParser from "body-parser";
import FabricCAServices from "fabric-ca-client";
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

// app.post("/chaincode", async (req, res) => {
//   try {
//     const enrollResp = await ca.enroll({ enrollmentID: id, enrollmentSecret: secret });
//     const user = new User(id);
//     await user.setEnrollment(enrollResp.key, enrollResp.certificate, MSP_ID);
//     const token = EnrolledUserCache.put(user);
//     res.status(200).send({ token });
//   } catch (e) {
//     res.status(400).send({ message: e.message });
//   }
// });

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
