import { NextFunction, Request, Response } from "express";
import { getFormattedApiResponse, HTTP_CODES } from "../utils/constants";
import { verifyToken } from "../models/authModel";
import { Socket } from "socket.io";
import { User } from "../types";

const PUBLIC_PATHS = [
  "/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
];

export interface AuthenticatedSocket extends Socket {
  user?: User;
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("Recieved A Request with token: ", req.headers.authorization);

  if (PUBLIC_PATHS.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  const token = authHeader && authHeader.split(" ")[1];

  if (token == undefined) {
    res.status(HTTP_CODES.UNAUTHORIZED).json(
      getFormattedApiResponse({
        message: "Unauthorized",
        code: HTTP_CODES.UNAUTHORIZED,
      })
    );
    return;
  }

  const validToken = verifyToken(token);
  if (!validToken) {
    res.status(HTTP_CODES.UNAUTHORIZED).json(
      getFormattedApiResponse({
        message: "Unauthorized",
        code: HTTP_CODES.UNAUTHORIZED,
      })
    );
    return;
  }

  next();
}

export function authenticateSocketToken(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): void {
  const token: string | undefined = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Unauthorized Socket User"));
  }

  const user = verifyToken(token);
  if (!user) {
    return next(new Error("Unauthorized Socket User - Error verifying user"));
  }

  socket.user = user;
  next();
}
