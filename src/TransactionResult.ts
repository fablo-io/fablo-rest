import matches from "ts-matches";

const payloadWithStatusShape = matches.shape({ status: matches.natural, payload: matches.any });

export default {
  parse: (b: Buffer): { status: number; response: any } => {
    try {
      const payload: Record<string, any> = JSON.parse(b.toString());
      if (payloadWithStatusShape.test(payload)) {
        return { status: payload.status, response: payload.payload };
      } else {
        return { status: 200, response: payload };
      }
    } catch (_e) {
      return { status: 200, response: b.toString() };
    }
  },
};
