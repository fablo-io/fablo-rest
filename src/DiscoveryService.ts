import NodeCache from "node-cache";
import { Client, DiscoveryService, User } from "fabric-common";
import config, { DiscovererConfig } from "./config";

const discoveryEndpointsIndexCache = new NodeCache({ stdTTL: 60 * 5, useClones: false });

const logger = config.getLogger("FabloRestDiscoveryService");

const { discovererConfigs } = config;

const attemptDiscovery = async (
  client: Client,
  channelName: string,
  user: User,
  discovererConfig: DiscovererConfig,
) => {
  const userId = user.getName();
  const identityContext = client.newIdentityContext(user);
  const channel = client.getChannel(channelName);

  const endpoint = client.newEndpoint({
    url: discovererConfig.url,
    "ssl-target-name-override": discovererConfig["ssl-target-name-override"],
    pem: discovererConfig.pem,
  });

  const discoverer = client.newDiscoverer(`discoverer-${userId}`);
  await discoverer.connect(endpoint);

  const discovery = channel.newDiscoveryService(`discovery-service-${channelName}-${userId}`);
  discovery.build(identityContext);
  discovery.sign(identityContext);
  await discovery.send({ targets: [discoverer], asLocalhost: config.AS_LOCALHOST });

  return discovery;
};

const createConnectedDiscoveryService = async (
  client: Client,
  channelName: string,
  user: User,
  preferredIndex?: number,
  attemptsLeft: number = discovererConfigs.length,
): Promise<DiscoveryService> => {
  const index = preferredIndex ?? discoveryEndpointsIndexCache.get(channelName) ?? 0;
  const discovererConfig = discovererConfigs[index];

  const loggerParams = `channel=${channelName}, endpoint=${discovererConfig.url}, atemptsLeft=${attemptsLeft}`;
  logger.debug(`Creating and connecting discovery service (${loggerParams})`);

  try {
    const discovery = await attemptDiscovery(client, channelName, user, discovererConfig);
    discoveryEndpointsIndexCache.set(channelName, index);
    logger.debug(`Default discovery endpoint set to ${discovererConfig.url} (${loggerParams})`);
    return discovery;
  } catch (e) {
    logger.debug(`Discovery failed (${loggerParams}, error=${e.message})`);

    if (attemptsLeft === 0) {
      logger.error(`Discovery failed and no more attempts left. Will return error response (channel=${channelName})`);
      throw new Error(`No available discoverers for channel ${channelName}`);
    }

    const nextIndex = (index + 1) % discovererConfigs.length;
    return await createConnectedDiscoveryService(client, channelName, user, nextIndex, attemptsLeft - 1);
  }
};

const create = async (client: Client, channelName: string, user: User): Promise<DiscoveryService> =>
  createConnectedDiscoveryService(client, channelName, user);

export default {
  create,
};
