import { Router } from "express";
import { authRouter } from "./authRouter";
import { postsRouter } from "./postsRouter";

export const router = Router();

router.use("/auth", authRouter);
router.use("/posts", postsRouter);
