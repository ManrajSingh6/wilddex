import { Router } from "express";
import {
  LoginRequestBody,
  RegisterRequestBody,
  TypedRequestBody,
  User,
} from "../types";
import { getFormattedApiResponse, HTTP_CODES } from "../utils/constants";
import {
  addUserAccount,
  doUserPasswordsMatch,
  getHashedPassword,
  getSignedJwtToken,
  getUserByEmail,
  verifyToken,
} from "../models/authModel";

export const authRouter = Router();

authRouter.post("/register", async (req: RegisterRequestBody, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "Missing required fields.",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  const userExists = await getUserByEmail(email);
  if (userExists) {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "User already exists.",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  const hashedPassword = await getHashedPassword(password);

  const addSuccess = await addUserAccount(email, name, hashedPassword);
  if (!addSuccess) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error creating user account.",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "User account added successfully.",
      code: HTTP_CODES.OK,
    })
  );
});

authRouter.post("/login", async (req: LoginRequestBody, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "Missing required fields.",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  const user = await getUserByEmail(email);
  if (!user) {
    res.status(HTTP_CODES.NOT_FOUND).json(
      getFormattedApiResponse({
        message: "User not found.",
        code: HTTP_CODES.NOT_FOUND,
      })
    );
    return;
  }

  if (!(await doUserPasswordsMatch(user.id, password))) {
    res.status(HTTP_CODES.UNAUTHORIZED).json(
      getFormattedApiResponse({
        message: `Password is incorrect for email ${email}`,
        code: HTTP_CODES.UNAUTHORIZED,
      })
    );
    return;
  }

  const safeUser: User = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  const token = getSignedJwtToken(safeUser);

  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "User logged in successfully.",
      data: {
        token,
        user: safeUser,
      },
      code: HTTP_CODES.OK,
    })
  );
});

authRouter.post(
  "/refresh",
  async (req: TypedRequestBody<{ refreshToken: string }>, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(HTTP_CODES.BAD_REQUEST).json(
        getFormattedApiResponse({
          message: "Missing required refreshToken.",
          code: HTTP_CODES.BAD_REQUEST,
        })
      );
      return;
    }

    const verifiedToken = verifyToken(refreshToken);
    if (!verifiedToken) {
      res.status(HTTP_CODES.UNAUTHORIZED).json(
        getFormattedApiResponse({
          message: "Invalid token.",
          code: HTTP_CODES.UNAUTHORIZED,
        })
      );
      return;
    }

    const safeUser: User = {
      id: verifiedToken.id,
      email: verifiedToken.email,
      name: verifiedToken.name,
    };

    const newToken = getSignedJwtToken(safeUser);

    res.status(HTTP_CODES.OK).json(
      getFormattedApiResponse({
        message: "Token refreshed successfully.",
        data: {
          token: newToken,
          user: safeUser,
        },
        code: HTTP_CODES.OK,
      })
    );
  }
);
