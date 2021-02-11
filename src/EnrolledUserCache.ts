import * as uuid from "uuid";
import NodeCache from "node-cache";
import { Wallet, Wallets, X509Identity } from "fabric-network";
import { ICryptoKey, User } from "fabric-common";

const cache = new NodeCache({ stdTTL: 60 * 10 });

interface CachedIdentity {
  identity: X509Identity;
  user: User;
}

const put = async (name: string, privateKey: ICryptoKey, certificate: string, mspId: string): Promise<string> => {
  const key = uuid.v1() + "-" + name;

  const identity: X509Identity = {
    credentials: {
      certificate,
      privateKey: privateKey.toBytes(),
    },
    mspId,
    type: "X.509",
  };

  const user = new User(name);
  await user.setEnrollment(privateKey, certificate, mspId);

  cache.set(key, { identity, user });
  return key;
};

const getUser = async (key: string): Promise<User | undefined> => {
  const identity: CachedIdentity | undefined = cache.get(key);
  if (!identity) return undefined;
  return identity.user;
};

const getIdentity = async (key: string): Promise<X509Identity | undefined> => {
  const identity: CachedIdentity | undefined = cache.get(key);
  if (!identity) return undefined;
  return identity.identity;
};

const getWallet = async (key: string): Promise<Wallet> => {
  const wallet = await Wallets.newInMemoryWallet();

  const identity: CachedIdentity | undefined = cache.get(key);
  if (!!identity) {
    await wallet.put(identity.user.getName(), identity.identity);
    return wallet;
  }

  return wallet;
};

export default { put, getUser, getIdentity, getWallet };
