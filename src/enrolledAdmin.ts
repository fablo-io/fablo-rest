import fs from "fs";
import FabricCAServices from "fabric-ca-client";
import { User } from "fabric-common";

// skąd wziąć cert admina
//
// console.log("Loading admin private key...");
// const adminPrivateKey = fs.readFileSync(
//   "fabrica-target/fabric-config/crypto-config/peerOrganizations/org1.com/users/Admin@org1.com/msp/keystore/priv-key.pem",
//   { encoding: "utf-8" },
// );

console.log("Loading admin cert...");
const adminCert = fs.readFileSync(
  "fabrica-target/fabric-config/crypto-config/peerOrganizations/org1.com/users/Admin@org1.com/msp/admincerts/Admin@org1.com-cert.pem",
  { encoding: "utf-8" },
);

const enrolledAdmin = async (ca: FabricCAServices): Promise<User> => {
  const name = "admin";
  const pass = "adminpw";
  const mspId = "Org1MSP";
  const response = await ca.enroll({ enrollmentID: name, enrollmentSecret: pass });

  const admin = User.createUser(name, pass, mspId, adminCert);
  await admin.setEnrollment(response.key, response.certificate, mspId);
  return admin;
};

export default enrolledAdmin;
