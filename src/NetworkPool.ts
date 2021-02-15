import NodeCache from "node-cache";
import { DefaultEventHandlerStrategies, DefaultQueryHandlerStrategies, Gateway, Network } from "fabric-network";
import { Client, User } from "fabric-common";
import { CachedIdentity } from "./IdentityCache";
import { AS_LOCALHOST, DISCOVERY_PEER_URLS } from "./config";

const cache = new NodeCache({ stdTTL: 60 * 5, useClones: false });

const createClient = async (user: User, channelName: string) => {
  const userId = user.getName();
  const client = Client.newClient(`client-${userId}`);
  const channel = client.getChannel(channelName);

  const connectedDiscoverers = DISCOVERY_PEER_URLS.map(async (url) => {
    const endpoint = client.newEndpoint({ url });
    const discoverer = client.newDiscoverer(`discoverer-${userId}`);
    await discoverer.connect(endpoint);
    return discoverer;
  });
  const targets = await Promise.all(connectedDiscoverers);

  const identityContext = client.newIdentityContext(user);
  const discovery = channel.newDiscoveryService(`discovery-service-${userId}`);
  discovery.build(identityContext);
  discovery.sign(identityContext);
  await discovery.send({ targets, asLocalhost: AS_LOCALHOST });

  return client;
};

const connectToNetwork = async (identity: CachedIdentity, channelName: string): Promise<Network> => {
  const client: Client = await createClient(identity.user, channelName);
  const gateway = new Gateway();

  await gateway.connect(client, {
    identity: identity.identity,
    discovery: {
      asLocalhost: AS_LOCALHOST,
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

export default { connect };
