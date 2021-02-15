export default {
  PORT: process.env.PORT ?? 8000,
  AFFILIATION: process.env.AFFILIATION ?? "org1",
  MSP_ID: process.env.MSP_ID ?? "Org1MSP",
  FABRIC_CA_URL: process.env.FABRIC_CA_URL ?? "http://localhost:7031",
  DISCOVERY_URLS: (process.env.DISCOVERY_URLS ?? "grpc://localhost:7060").split(",").map((url) => url.trim()),
  AS_LOCALHOST: (process.env.AS_LOCALHOST ?? "true") === "true",
};
