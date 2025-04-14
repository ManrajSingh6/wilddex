import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";
import Redlock from "redlock";

dotenv.config();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
}) as unknown as RedisClientType;

redisClient.on("error", (error) => {
  console.error("Redis client error:", error);
});

async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    console.log("Redis client connected.");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
}

const redlock = new Redlock([redisClient], {
  retryCount: 10,
  retryDelay: 200, // time in ms
  retryJitter: 200, // time in ms
});

redlock.on("clientError", (err) => {
  console.error(
    "A redis error has occurred when trying to create redlock instance:",
    err
  );
});

export { redisClient, connectRedis, redlock };
