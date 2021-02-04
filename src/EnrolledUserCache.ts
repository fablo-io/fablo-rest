import * as uuid from "uuid";
import NodeCache from "node-cache";
import { User } from "fabric-common";
const cache = new NodeCache({ stdTTL: 60 * 10 });

const put = (user: User): string => {
  const key = uuid.v1() + "-" + user.getName();
  cache.set(key, user);
  return key;
};

const get = (key: string): User | undefined => cache.get(key);

export default { put, get };
