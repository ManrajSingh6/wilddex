import Client from "ioredis";
import dotenv from "dotenv";
import Redlock from "redlock";

dotenv.config();

const redisClient = new Client({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
});

const redisClientBackup = new Client({
  host: process.env.REDIS_HOST_2,
  port: Number(process.env.REDIS_PORT_2),
});

const redisClientSecondaryBackup = new Client({
  host: process.env.REDIS_HOST_3,
  port: Number(process.env.REDIS_PORT_3),
});

const REDIS_INSTANCES = [
  redisClient,
  redisClientBackup,
  redisClientSecondaryBackup,
];

redisClient.on("error", (error) => {
  console.error("Redis client 1 error:", error);
});

redisClientBackup.on("error", (error) => {
  console.error("Redis client 2 error:", error);
});

redisClientSecondaryBackup.on("error", (error) => {
  console.error("Redis client 3 error:", error);
});

const redlock = new Redlock(REDIS_INSTANCES, {
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

export { redisClient, redlock };
