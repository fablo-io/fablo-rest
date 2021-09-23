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

const getDiscovererConfigs = (urls: string, sslNameOverrides: string, pemPaths: string): DiscovererConfig[] => {
  const splitToArray = (s: string) => (!s.length ? [] : s.split(",").map((s) => s.trim()));
  const urlArray = splitToArray(urls);
  const sslNameOverridesArray = splitToArray(sslNameOverrides);
  const pemArray = splitToArray(pemPaths);

  return urlArray.map((url, i) => {
    const name = sslNameOverridesArray[i];
    const pem = pemArray[i];
    console.log(`Configuring discoverer (url=${url}, ssl-name-override=${name}, pem=${pem})`);
    return {
      url,
      "ssl-target-name-override": name,
      pem: readCertFile(pem),
    };
  });
};

const defaults = {
  PORT: 8000,
  AFFILIATION: "org1",
  MSP_ID: "Org1MSP",
  FABRIC_CA_URL: "http://localhost:7031",
  FABRIC_CA_NAME: "ca.org1.com",
  AS_LOCALHOST: "true",
  DISCOVERY_URLS: "grpcs://localhost:7060",
  DISCOVERY_SSL_TARGET_NAME_OVERRIDES: "peer0.org1.com",
  DISCOVERY_TLS_CA_CERT_FILES: path.join(
    __dirname,
    "../test-network/fablo-target/fabric-config/crypto-config/peerOrganizations/org1.com/peers/peer0.org1.com/tls/ca.crt",
  ),
};

export default {
  PORT: process.env.PORT ?? defaults.PORT,
  AFFILIATION: process.env.AFFILIATION ?? defaults.AFFILIATION,
  MSP_ID: process.env.MSP_ID ?? defaults.MSP_ID,
  FABRIC_CA_URL: process.env.FABRIC_CA_URL ?? defaults.FABRIC_CA_URL,
  FABRIC_CA_NAME: process.env.FABRIC_CA_NAME ?? defaults.FABRIC_CA_NAME,
  AS_LOCALHOST: (process.env.AS_LOCALHOST ?? defaults.AS_LOCALHOST) === "true",

  discovererConfigs: getDiscovererConfigs(
    process.env.DISCOVERY_URLS ?? defaults.DISCOVERY_URLS,
    process.env.DISCOVERY_SSL_TARGET_NAME_OVERRIDES ?? defaults.DISCOVERY_SSL_TARGET_NAME_OVERRIDES,
    process.env.DISCOVERY_TLS_CA_CERT_FILES ?? defaults.DISCOVERY_TLS_CA_CERT_FILES,
  ),
};
