import NodeCache from "node-cache";
import { DefaultEventHandlerStrategies, DefaultQueryHandlerStrategies, Gateway, Network } from "fabric-network";
import { Client, User } from "fabric-common";
import { CachedIdentity } from "./IdentityCache";
import config from "./config";
import DiscoveryService from "./DiscoveryService";

const networksCache = new NodeCache({ stdTTL: 60 * 5, useClones: false });

networksCache.on("del", (_, value) => {
  (value as Network)?.getGateway()?.disconnect();
});

const logger = config.getLogger("FabloRestNetworkPool");

const createClient = async (user: User, channelName: string) => {
  const userId = user.getName();
  const client = Client.newClient(`client-${userId}`);
  const discovery = await DiscoveryService.create(client, channelName, user);
  return { client, discovery };
};

const discover = async (user: User, channelName: string): Promise<Record<string, any>> => {
  const { discovery } = await createClient(user, channelName);
  const results = discovery.getDiscoveryResults(true);
  return results;
};

const connectToNetwork = async (identity: CachedIdentity, channelName: string): Promise<Network> => {
  const { client } = await createClient(identity.user, channelName);
  const gateway = new Gateway();

  await gateway.connect(client, {
    identity: identity.identity,
    discovery: {
      asLocalhost: config.AS_LOCALHOST,
      enabled: true,
    },
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ALLFORTX,
    },
    queryHandlerOptions: {
      strategy: DefaultQueryHandlerStrategies.MSPID_SCOPE_ROUND_ROBIN,
    },
  });

  const network = await gateway.getNetwork(channelName);
  return network;
};

const connect = async (identity: CachedIdentity, channelName: string): Promise<Network> => {
  const loggerParams = `user=${identity.user.getName()}, channel=${channelName}`;
  logger.debug(`Connecting to network (${loggerParams})`);

  const key = `${identity.user.getName()}-${channelName}`;
  const networkFromCache: Network | undefined = networksCache.get(key);

  if (!networkFromCache) {
    logger.debug(`Creating new network (${loggerParams})`);
    const network = await connectToNetwork(identity, channelName);
    networksCache.set(key, network);
    return network;
  } else {
    logger.debug(`Got network from cache (${loggerParams})`);
    return networkFromCache;
  }
};

export default { discover, connect };
