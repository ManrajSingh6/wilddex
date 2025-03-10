import { Router } from "express";
import {
  createPost,
  getPostById,
  getPosts,
  getPostsByUserId,
  getPostUpvotes,
  getPostUpvotesByUserId,
  getUpvoteByPostIdAndUserId,
  updatePostVotes,
} from "../models/postsModel";
import { getFormattedApiResponse, HTTP_CODES } from "../utils/constants";
import {
  CreatePostInsert,
  CreatePostRequestBody,
  NewPostNotification,
  NewPostUpvoteNotification,
  UpvotePostRequestBody,
} from "../types";
import { randomUUID } from "crypto";
import { supabase } from "../supabase/supabase";
import { checkAndAwardBadges } from "../utils/bagdes";
import { io } from "../index";
import { getUserById } from "../models/authModel";

const SUPABASE_IMAGE_BUCKET = "wilddex-images";
const BASE_64_IMAGE_REGEX = /^data:(.+);base64,(.*)$/;
const PREDICTION_API_URL = `${process.env.PREDICTION_API_URL}/get-prediction`;

const OPEN_ROUTER_BASE_URL = process.env.OPEN_ROUTER_BASE_URL ?? "";
const RESPONSE_DELIMITER = "</think>";

export const postsRouter = Router();

// GET endpoint to fetch all posts
postsRouter.get("/", async (_req, res) => {
  const posts = await getPosts();

  if (!posts) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error fetching posts from database",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
        data: null,
      })
    );
    return;
  }

  const sortedPostsTimeDesc = [...posts].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "Posts fetched successfully",
      code: HTTP_CODES.OK,
      data: sortedPostsTimeDesc,
    })
  );
});

// GET endpoint to fetch all posts for a user by user ID
postsRouter.get("/:userId", async (req, res) => {
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
  const posts = await getPostsByUserId(sanitizedUserId);
  if (!posts) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error fetching posts from database",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
        data: null,
      })
    );
    return;
  }

  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "Posts fetched successfully",
      code: HTTP_CODES.OK,
      data: posts,
    })
  );
});

// POST endpoint to create a new post
postsRouter.post("/create", async (req: CreatePostRequestBody, res) => {
  const { userId, encodedImage, timestamp, latitude, longitude, notes } =
    req.body;

  if (!userId || !encodedImage || !timestamp || !latitude || !longitude) {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "Missing required fields.",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "User does not exist.",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  // Decode the image
  const imageRegexMatch = encodedImage.match(BASE_64_IMAGE_REGEX);
  if (!imageRegexMatch) {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "Invalid image encoding",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  const mimeType = imageRegexMatch[1];
  const base64EncodedImageData = imageRegexMatch[2];
  const imageBuffer = Buffer.from(base64EncodedImageData, "base64");
  const uniqueImageName = `${Date.now()}_${randomUUID()}`;

  // Classify the animal in the image make a call to the Flask API
  const classificationResponse = await fetch(PREDICTION_API_URL, {
    method: "POST",
    body: JSON.stringify({
      image: base64EncodedImageData,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!classificationResponse.ok) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error classifying image",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  const classificationJSON = await classificationResponse.json();
  const classification = classificationJSON.result as string;

  // Make OpenAI API call to generate conservation notes
  const openRouterResponse = await fetch(OPEN_ROUTER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
      messages: [
        {
          role: "system",
          content: `You are a summary bot. You have been asked to give 3 concise and easy to understand sentences about how to help the conservation of an animal. Don't include self-dialogue, only include the response to the users query.`,
        },
        {
          role: "user",
          content: classification,
        },
      ],
    }),
  });
  if (!openRouterResponse.ok) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error generating conservation notes",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  const openRouterResponseJSON = await openRouterResponse.json();

  // console.log(openRouterResponseJSON.choices[0].message.content);

  const openRouterResponseText =
    openRouterResponseJSON.choices[0].message.content;

  // Save the image to cloud storage
  const filePath = `uploads/${uniqueImageName}`;
  const { data: uploadedImage, error: imageUploadError } =
    await supabase.storage
      .from(SUPABASE_IMAGE_BUCKET)
      .upload(filePath, imageBuffer, {
        contentType: mimeType,
      });
  if (imageUploadError || !uploadedImage) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error uploading image to cloud storage",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  const { data } = supabase.storage
    .from(SUPABASE_IMAGE_BUCKET)
    .getPublicUrl(filePath);

  // Save the post to the database
  const dbInsert: CreatePostInsert = {
    userId: user.id,
    animal: classification,
    notes: notes ?? null,
    conservationNotes:
      openRouterResponseText ||
      `Here are some conservation notes for ${classification}`,
    imageUrl: data.publicUrl,
    latitude,
    longitude,
  };

  const createdPost = await createPost(dbInsert);
  if (!createdPost) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error creating post in database",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  await checkAndAwardBadges(user.id);

  const newPostNotification: NewPostNotification = {
    notificationId: randomUUID(),
    postId: createdPost.id,
    postTitle: createdPost.animal,
    timestamp: new Date(),
    postedBy: {
      userId: user.id,
      name: user.name,
    },
  };

  // Broadcast the notification to all connected clients
  io.emit("new-post", newPostNotification);

  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "Post created successfully",
      code: HTTP_CODES.OK,
    })
  );
});

// POST endpoint to upvote a post
postsRouter.post("/vote", async (req: UpvotePostRequestBody, res) => {
  const postId = req.body.id;

  if (!postId) {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "Missing required Post ID.",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  const post = await getPostById(postId);
  if (post === null) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: `No post exists with id: ${postId}`,
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  if (post === undefined) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: `Error fetching post with id: ${postId}`,
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  const likedByUser = await getUserById(req.body.userId);
  if (!likedByUser) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: `Error liking post.`,
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  const userAlreadyUpvoted = await getUpvoteByPostIdAndUserId(
    postId,
    likedByUser.id
  );
  if (userAlreadyUpvoted === undefined) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error fetching upvote from database",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  if (userAlreadyUpvoted && req.body.operation === "increment") {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "User has already voted on this post",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  if (!userAlreadyUpvoted && req.body.operation === "decrement") {
    res.status(HTTP_CODES.BAD_REQUEST).json(
      getFormattedApiResponse({
        message: "User has not voted on this post",
        code: HTTP_CODES.BAD_REQUEST,
      })
    );
    return;
  }

  const updateSuccess = await updatePostVotes(
    postId,
    req.body.operation,
    req.body.userId
  );
  if (!updateSuccess) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: "Error updating post votes in database",
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  if (req.body.operation === "increment") {
    const postUpvotes = await getPostUpvotes(postId);
    if (postUpvotes) {
      const newUpvoteNotif: NewPostUpvoteNotification = {
        notificationId: randomUUID(),
        postId,
        postTitle: post.animal,
        upvoteCount: postUpvotes,
        likedBy: {
          userId: likedByUser.id,
          name: likedByUser.name,
        },
        timestamp: new Date(),
      };

      io.to(post.userId.toString()).emit("new-upvote", newUpvoteNotif);
    }
  }

  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "Post votes updated successfully",
      code: HTTP_CODES.OK,
    })
  );
});

postsRouter.get("/votes/:userId", async (req, res) => {
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
  const userUpvotes = await getPostUpvotesByUserId(sanitizedUserId);
  if (!userUpvotes) {
    res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json(
      getFormattedApiResponse({
        message: `Error fetching upvotes from database for user with ID: ${userId}`,
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      })
    );
    return;
  }

  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "Upvotes fetched successfully",
      code: HTTP_CODES.OK,
      data: userUpvotes,
    })
  );
});
