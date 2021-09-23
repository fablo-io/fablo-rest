import NodeCache from "node-cache";
import { DefaultEventHandlerStrategies, DefaultQueryHandlerStrategies, Gateway, Network } from "fabric-network";
import { Client, User } from "fabric-common";
import { CachedIdentity } from "./IdentityCache";
import config from "./config";

const cache = new NodeCache({ stdTTL: 60 * 5, useClones: false });

const createClient = async (user: User, channelName: string) => {
  const userId = user.getName();
  const client = Client.newClient(`client-${userId}`);
  const channel = client.getChannel(channelName);

  const connectedDiscoverers = config.discovererConfigs.map(async (config) => {
    const endpoint = client.newEndpoint({
      url: config.url,
      "ssl-target-name-override": config["ssl-target-name-override"],
      pem: config.pem,
    });
    const discoverer = client.newDiscoverer(`discoverer-${userId}`);
    await discoverer.connect(endpoint);
    return discoverer;
  });
  const targets = await Promise.all(connectedDiscoverers);

  const identityContext = client.newIdentityContext(user);
  const discovery = channel.newDiscoveryService(`discovery-service-${userId}`);
  discovery.build(identityContext);
  discovery.sign(identityContext);
  await discovery.send({ targets, asLocalhost: config.AS_LOCALHOST });

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
  const key = `${identity.user.getName()}-${channelName}`;
  const networkFromCache: Network | undefined = cache.get(key);

  if (!networkFromCache) {
    const network = await connectToNetwork(identity, channelName);
    cache.set(key, network);
    return network;
  } else {
    return networkFromCache;
  }
};

export default { discover, connect };
