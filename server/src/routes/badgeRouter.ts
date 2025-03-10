import { Router } from "express";
import { getFormattedApiResponse, HTTP_CODES } from "../utils/constants";
import { getBadgesByUserId } from "../models/badgeModel";

export const badgeRouter = Router();

badgeRouter.get("/:userId", async (req, res) => {
  const userId = req.params.userId;
  if (!userId) {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "Missing required User ID.",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  const sanitizedUserId = userId as unknown as number;
  const badges = await getBadgesByUserId(sanitizedUserId);
  if (!badges) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error fetching badges from database",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "Badges fetched successfully",
      code: HTTP_CODES.OK,
      data: badges,
    })
  );
});
