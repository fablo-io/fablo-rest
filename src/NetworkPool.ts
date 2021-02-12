import NodeCache from "node-cache";
import { Gateway, Network } from "fabric-network";
import { Client, User } from "fabric-common";
import { CachedIdentity } from "./IdentityCache";

const cache = new NodeCache({ stdTTL: 60 * 5, useClones: false });

const createClient = async (user: User, channelName: string, MSP_ID: string) => {
  const userId = user.getName();
  const client = Client.newClient(`client-${userId}`);
  const channel = client.getChannel(channelName);

  const endpoint = client.newEndpoint({ url: "grpc://localhost:7060" });
  const discoverer = client.newDiscoverer(`discoverer-${userId}`, MSP_ID);
  await discoverer.connect(endpoint);

  const identityContext = client.newIdentityContext(user);
  const discovery = channel.newDiscoveryService(`discovery-service-${userId}`);
  discovery.build(identityContext);
  discovery.sign(identityContext);
  await discovery.send({ targets: [discoverer], asLocalhost: true });

  return client;
};

const connectToNetwork = async (identity: CachedIdentity, channelName: string, MSP_ID: string): Promise<Network> => {
  const client: Client = await createClient(identity.user, channelName, MSP_ID);
  const gateway = new Gateway();
  await gateway.connect(client, { identity: identity.identity, discovery: { asLocalhost: true, enabled: true } });
  const network = await gateway.getNetwork(channelName);

  return network;
};

const connect = async (identity: CachedIdentity, channelName: string, MSP_ID: string): Promise<Network> => {
  const key = `${identity.user.getName()}-${channelName}`;
  const networkFromCache: Network | undefined = cache.get(key);

  if (!networkFromCache) {
    const network = await connectToNetwork(identity, channelName, MSP_ID);
    cache.set(key, network);
    return network;
  } else {
    return networkFromCache;
  }
};

export default { connect };
