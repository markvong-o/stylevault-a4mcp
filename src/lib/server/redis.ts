import { Redis } from "@upstash/redis";

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;

if (REST_URL && REST_TOKEN) {
  redis = new Redis({ url: REST_URL, token: REST_TOKEN });
  console.log("[redis] connected via Upstash REST");
} else {
  console.log("[redis] UPSTASH_REDIS_REST_URL/TOKEN not set, using in-memory storage");
}

export { redis };
