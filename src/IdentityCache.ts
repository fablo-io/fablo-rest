import * as uuid from "uuid";
import NodeCache from "node-cache";
import { X509Identity } from "fabric-network";
import { ICryptoKey, User } from "fabric-common";

const cache = new NodeCache({ stdTTL: 60 * 10, useClones: false });

export interface CachedIdentity {
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

const del = (key: string): number => cache.del(key);

const get = async (key: string): Promise<CachedIdentity | undefined> => cache.get(key);

export default { put, get, del };
