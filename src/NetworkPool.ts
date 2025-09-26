import NodeCache from "node-cache";
import * as grpc from "@grpc/grpc-js";
import { connect, Gateway, Identity, Signer, signers } from "@hyperledger/fabric-gateway";
import crypto from "crypto";
import { Client, User } from "fabric-common";
import { CachedIdentity } from "./IdentityCache";
import config from "./config";
import DiscoveryService from "./DiscoveryService";

const networksCache = new NodeCache({ stdTTL: 60 * 5, useClones: false });
networksCache.on("del", (_, value) => {
  (value as Gateway)?.close();
});

const logger = config.getLogger("FabloRestNetworkPool");

interface CachedNetwork {
  gateway: Gateway;
  channelName: string;
}

const createGatewayWithEndpoint = (identity: CachedIdentity, dc: any): Gateway => {
  const address = dc.url.replace(/^grpcs?:\/\//, "");
  const credentials = dc.pem ? grpc.credentials.createSsl(Buffer.from(dc.pem)) : grpc.credentials.createInsecure();

  const options: grpc.ClientOptions = {};
  if (dc["ssl-target-name-override"]) {
    options["grpc.ssl_target_name_override"] = dc["ssl-target-name-override"];
  }

  const client = new grpc.Client(address, credentials, options);

  // Extract from the stored identity object
  const signer: Signer = signers.newPrivateKeySigner(crypto.createPrivateKey(identity.identity.credentials.privateKey));

  const gwIdentity: Identity = {
    mspId: identity.identity.mspId,
    credentials: Buffer.from(identity.identity.credentials.certificate),
  };

  return connect({
    client,
    identity: gwIdentity,
    signer,
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
    endorseOptions: () => ({ deadline: Date.now() + 15000 }),
    submitOptions: () => ({ deadline: Date.now() + 5000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
  });
};

const createGateway = (identity: CachedIdentity, channelName: string): Gateway => {
  const configs = config.discovererConfigs;
  if (configs.length === 0) throw new Error("No discovery endpoints configured");

  let lastError: Error | undefined;

  for (let i = 0; i < configs.length; i++) {
    try {
      const gateway = createGatewayWithEndpoint(identity, configs[i]);

      // Test the connection by attempting to get the network
      // This will fail if the peer doesn't have access to the channel
      gateway.getNetwork(channelName);

      logger.debug(`Connected to ${configs[i].url} for channel=${channelName}, user=${identity.user.getName()}`);
      return gateway;
    } catch (e: any) {
      lastError = e;
      logger.debug(`Failed to connect to ${configs[i].url} for channel=${channelName}: ${e.message}`);
    }
  }

  throw new Error(`No available gateways for channel ${channelName}. Last error: ${lastError?.message}`);
};

const getNetwork = async (identity: CachedIdentity, channelName: string): Promise<CachedNetwork> => {
  const key = `${identity.user.getName()}-${channelName}`;
  const cached = networksCache.get<CachedNetwork>(key);

  if (cached) {
    logger.debug(`Got network from cache (user=${identity.user.getName()}, channel=${channelName})`);
    return cached;
  }

  logger.debug(`Creating new network (user=${identity.user.getName()}, channel=${channelName})`);
  const gateway = createGateway(identity, channelName);
  const network = { gateway, channelName };
  networksCache.set(key, network);
  return network;
};

const discover = async (user: User, channelName: string): Promise<Record<string, any>> => {
  const userId = user.getName();
  const client = Client.newClient(`client-${userId}`);
  const discovery = await DiscoveryService.create(client, channelName, user);
  return discovery.getDiscoveryResults(true);
};

const invoke = async (
  identity: CachedIdentity,
  channelName: string,
  chaincodeName: string,
  method: string,
  args: string[],
  transient?: Record<string, Buffer>,
): Promise<Buffer> => {
  const { gateway } = await getNetwork(identity, channelName);
  const network = gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);

  const proposal = contract.newProposal(method, {
    arguments: args,
    transientData: transient,
  });

  const transaction = await proposal.endorse();
  const commit = await transaction.submit();
  const status = await commit.getStatus();

  if (status.code !== 0) {
    const error = new Error(`Transaction failed with code ${status.code}`);
    (error as any).transactionCode = status.code.toString();
    throw error;
  }

  return Buffer.from(transaction.getResult());
};

const query = async (
  identity: CachedIdentity,
  channelName: string,
  chaincodeName: string,
  method: string,
  args: string[],
  transient?: Record<string, Buffer>,
): Promise<Buffer> => {
  const { gateway } = await getNetwork(identity, channelName);
  const network = gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);

  const proposal = contract.newProposal(method, {
    arguments: args,
    transientData: transient,
  });

  const result = await proposal.evaluate();
  return Buffer.from(result);
};

export default { discover, invoke, query };
