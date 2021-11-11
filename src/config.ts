import fs from "fs";
import { Utils } from "fabric-common";
import { LoggerInstance } from "winston";

const logger = Utils.getLogger("FabloRestConfig");

const readCertFile = (path: string): string => {
  const buffer = fs.readFileSync(path);
  return buffer.toString();
};

export interface DiscovererConfig {
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
    logger.info(`Configuring discoverer (url=${url}, ssl-name-override=${name}, pem=${pem})`);
    return {
      url,
      "ssl-target-name-override": name && name.length ? name : undefined,
      pem: pem && pem.length ? readCertFile(pem) : undefined,
    };
  });
};

const defaults: Record<string, string> = {
  PORT: "8000",
  MSP_ID: "Org1MSP",
  FABRIC_CA_URL: "http://localhost:7040",
  FABRIC_CA_NAME: "ca.org1.com",
  AS_LOCALHOST: "true",
  DISCOVERY_URLS: "grpc://localhost:7041,grpc://localhost:7061",
  DISCOVERY_SSL_TARGET_NAME_OVERRIDES: "",
  DISCOVERY_TLS_CA_CERT_FILES: "",
};

const getOrDefault = (key: string): string => {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;

  const defaultValue = defaults[key];
  logger.warn(`No environment variable ${key} declared, using default ${defaultValue}`);
  return defaultValue;
};

export default {
  PORT: getOrDefault("PORT"),
  MSP_ID: getOrDefault("MSP_ID"),
  FABRIC_CA_URL: getOrDefault("FABRIC_CA_URL"),
  FABRIC_CA_NAME: getOrDefault("FABRIC_CA_NAME"),
  AS_LOCALHOST: getOrDefault("AS_LOCALHOST") === "true",

  discovererConfigs: getDiscovererConfigs(
    getOrDefault("DISCOVERY_URLS"),
    getOrDefault("DISCOVERY_SSL_TARGET_NAME_OVERRIDES"),
    getOrDefault("DISCOVERY_TLS_CA_CERT_FILES"),
  ),

  getLogger: (name: string): LoggerInstance => Utils.getLogger(name),
};
