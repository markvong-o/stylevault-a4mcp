import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

let redis: Redis | null = null;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on("connect", () => console.log("[redis] connected to", REDIS_URL));
  redis.on("error", (err) => console.error("[redis] error:", err.message));

  redis.connect().catch(() => {});
} else {
  console.log("[redis] REDIS_URL not set, using in-memory storage");
}

export { redis };
