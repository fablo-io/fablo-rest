import express from "express";
import bodyParser from "body-parser";
import FabricCAServices from "fabric-ca-client";
import enrolledAdmin from "./enrolledAdmin";

const PORT = 8000;

const app = express();
app.use(bodyParser.json());

app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const ca = new FabricCAServices("http://localhost:7031");

// enroll - POSTem user/pass
// invoke/query standardowo

app.post("/admin/user/register", (req, res) => {
  const id = req.body.id;
  const secret = req.body.secret;

  const registerRequest = {
    enrollmentID: id,
    enrollmentSecret: secret,
    role: "user",
    affiliation: "org1",
  };

  enrolledAdmin(ca)
    .then((admin) => ca.register(registerRequest, admin))
    .then(() => res.status(201).send({ message: "ok" }))
    .catch((e) => res.status(400).send({ message: e.message }));
});

app.post("/user/enroll", (req, res) => {
  const id = req.body.id;
  const secret = req.body.secret;

  ca.enroll({ enrollmentID: id, enrollmentSecret: secret })
    .then((enrollResp) => {
      console.log(enrollResp);
      res.status(200).send({ key: enrollResp.key.toBytes(), certificate: enrollResp.certificate });
    })
    .catch((e) => res.status(400).send({ message: e.message }));
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
