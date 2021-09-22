import fs from "fs";
import path from "path";

const readCertFile = (path: string): string => {
  const buffer = fs.readFileSync(path);
  return buffer.toString();
};

interface DiscovererConfig {
  url: string;
  pem?: string;
  "ssl-target-name-override"?: string;
}

const getDiscovererConfigs = (urls: string, pemPaths: string, sslNameOverrides: string): DiscovererConfig[] => {
  const arr = (s: string) => s.split(",").map((s) => s.trim());
  const urlArr = arr(urls);
  const pemArr = arr(pemPaths);
  const nameArr = arr(sslNameOverrides);

  return urlArr.map((url, i) => {
    const pem = (pemArr ?? [])[i];
    const name = (nameArr ?? [])[i];
    console.log(`Configuring discoverer (url=${url}, ssl-name-override=${name}, pem=${pem})`);
    return {
      url,
      "ssl-target-name-override": name,
      pem: readCertFile(pem),
    };
  });
};

export default {
  PORT: process.env.PORT ?? 8000,
  AFFILIATION: process.env.AFFILIATION ?? "org1",
  MSP_ID: process.env.MSP_ID ?? "Org1MSP",
  FABRIC_CA_URL: process.env.FABRIC_CA_URL ?? "http://localhost:7031",
  FABRIC_CA_NAME: process.env.FABRIC_CA_NAME ?? "ca.org1.com",
  AS_LOCALHOST: (process.env.AS_LOCALHOST ?? "true") === "true",

  discovererConfigs: getDiscovererConfigs(
    process.env.DISCOVERY_URLS ?? "grpcs://localhost:7060",
    process.env.DISCOVERY_TLS_CA_CERT_FILES ??
      path.join(
        __dirname,
        "../test-network/fablo-target/fabric-config/crypto-config/peerOrganizations/org1.com/peers/peer0.org1.com/tls/ca.crt",
      ),
    process.env.DISCOVERY_SSL_TARGET_NAME_OVERRIDES ?? "peer0.org1.com",
  ),
};
