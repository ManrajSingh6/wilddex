import { Request } from "express";

export interface TypedRequestBody<T> extends Request {
  body: T;
}

export interface Post {
  id: number;
  userId: number;
  animal: string;
  notes: string | null;
  conservationNotes: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  upvotes: number;
}

export type CreatePostRequestBody = TypedRequestBody<{
  userId: number;
  notes: string | undefined;
  encodedImage: string;
  timestamp: string;
  latitude: number;
  longitude: number;
}>;

export type CreatePostInsert = Omit<Post, "id" | "createdAt" | "upvotes">;

export type UpvotePostRequestBody = TypedRequestBody<
  Pick<Post, "id"> & { operation: "increment" | "decrement"; userId: number }
>;

export interface Badge {
  id: number;
  userId: number;
  title: string;
  description: string;
  imageUrl: string;
  dateEarned: Date;
}

export type AssignBadgeInsert = Omit<Badge, "dateEarned">;

export type LoginRequestBody = TypedRequestBody<{
  email: string;
  password: string;
}>;

export type RegisterRequestBody = TypedRequestBody<
  Omit<User, "id"> & { password: string }
>; // The register request has a password field as input

export interface User {
  id: number;
  email: string;
  name: string; // Password is not included in the User type for security reasons
}

export interface NewPostUpvoteNotification {
  notificationId: string;
  postId: number;
  postTitle: string;
  upvoteCount: number;
  likedBy: {
    userId: number;
    name: string;
  };
  timestamp: Date;
}

export interface NewPostNotification {
  notificationId: string;
  postId: number;
  postTitle: string;
  postedBy: {
    userId: number;
    name: string;
  };
  timestamp: Date;
}
