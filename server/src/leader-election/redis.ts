import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

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

export { redisClient, connectRedis };
