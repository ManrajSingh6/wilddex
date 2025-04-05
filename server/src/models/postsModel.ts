import { and, eq } from "drizzle-orm";
import { dbClient } from "../index";
import { postsTable, upvotesTable } from "../db/schema";
import { CreatePostInsert, Post } from "../types";
import {
  deleteFromDatabases,
  readFromDatabases,
  writeToDatabases,
} from "../db/dbIO";

export async function getPostById(
  postId: number
): Promise<Post | null | undefined> {
  try {
    const allDbInserts = await readFromDatabases(postsTable, { id: postId });
    if (!allDbInserts) {
      throw new Error("Failed to fetch post from all databases");
    }
    const postFromAllDb = allDbInserts.find((post) => post.id === postId);

    if (!postFromAllDb) {
      return null;
    }

    const postUpvotes = await getPostUpvotes(postId);
    if (postUpvotes === undefined) {
      throw new Error(`Error fetching post upvotes for Post ID: ${postId}`);
    }

    return { ...postFromAllDb, upvotes: postUpvotes };
  } catch (error) {
    console.error(
      `Error fetching post from database: ${JSON.stringify(error)}`
    );
    return undefined;
  }
}

export async function getPosts(): Promise<readonly Post[] | undefined> {
  try {
    const posts = await readFromDatabases(postsTable);

    if (!posts) {
      throw new Error("Failed to fetch posts from all databases");
    }

    // For each post, asynchronously get the upvotes count
    const postsWithUpvotes = await Promise.all(
      posts.map(async (post) => {
        const upvotes = await getPostUpvotes(post.id);
        return { ...post, upvotes: upvotes ?? 0 };
      })
    );

    return postsWithUpvotes;
  } catch (error) {
    console.error(
      `Error fetching posts from database: ${JSON.stringify(error)}`
    );
    return undefined;
  }
}

export async function getPostsByUserId(
  userId: number
): Promise<readonly Post[] | undefined> {
  try {
    const posts = await readFromDatabases(postsTable, { userId });

    if (!posts) {
      throw new Error("Failed to fetch posts from all databases");
    }

    // For each post, asynchronously get the upvotes count
    const postsWithUpvotes = await Promise.all(
      posts.map(async (post) => {
        const upvotes = await getPostUpvotes(post.id);
        return { ...post, upvotes: upvotes ?? 0 };
      })
    );

    return postsWithUpvotes;
  } catch (error) {
    console.error(
      `Error fetching posts from database: ${JSON.stringify(error)}`
    );
    return undefined;
  }
}

export async function createPost(
  insert: CreatePostInsert
): Promise<Post | undefined> {
  try {
    const postsInsert = await writeToDatabases<typeof postsTable>(
      postsTable,
      insert
    );

    if (postsInsert.every((insert) => insert === undefined)) {
      throw new Error("All db inserts failed.");
    }

    const insertedPost = postsInsert.find((insert) => insert !== undefined);

    if (!insertedPost) {
      throw new Error("Failed to find inserted post");
    }

    const postUpvotes = await getPostUpvotes(insertedPost.id);
    if (postUpvotes === undefined) {
      throw new Error(
        `Error fetching post upvotes for Post ID: ${insertedPost.id}`
      );
    }

    return { ...insertedPost, upvotes: postUpvotes };
  } catch (error) {
    console.error(`Error creating post in database: ${JSON.stringify(error)}`);
    return undefined;
  }
}

export async function getPostUpvotes(
  postId: number
): Promise<number | undefined> {
  try {
    const upvotes = await readFromDatabases(upvotesTable, { postId });

    if (upvotes === undefined) {
      throw new Error("Failed to fetch upvotes from all databases");
    }

    return upvotes.length;
  } catch (error) {
    console.error(
      `Error fetching post likes from database: ${JSON.stringify(error)}`
    );
    return undefined;
  }
}

export async function updatePostVotes(
  postId: number,
  operation: "increment" | "decrement",
  userId: number
): Promise<boolean> {
  try {
    if (operation === "increment") {
      // Write to all active databases without duplicating the primary insertion.
      const allDbInserts = await writeToDatabases(upvotesTable, {
        postId,
        userId,
      });
      if (allDbInserts.every((insert) => insert === undefined)) {
        throw new Error("Failed to insert into all databases");
      }
    } else {
      await deleteFromDatabases(upvotesTable, { postId, userId });
    }
    return true;
  } catch (error) {
    console.error(
      `Error updating post votes in database: ${JSON.stringify(error)}`
    );
    return false;
  }
}

export async function getUpvoteByPostIdAndUserId(
  postId: number,
  userId: number
): Promise<boolean | undefined> {
  try {
    const upvotes = await readFromDatabases(upvotesTable, { postId, userId });

    if (!upvotes) {
      throw new Error("Failed to fetch upvotes from all databases");
    }

    const upvote = upvotes.find(
      (upvote) => upvote.postId === postId && upvote.userId === userId
    );

    return upvote !== undefined;
  } catch (error) {
    console.error(
      `Error fetching upvote from database: ${JSON.stringify(error)}`
    );
    return undefined;
  }
}

export async function getPostUpvotesByUserId(
  userId: number
): Promise<readonly number[] | undefined> {
  try {
    const allDbInserts = await readFromDatabases(upvotesTable, { userId });

    if (!allDbInserts) {
      throw new Error("Failed to fetch upvotes from all databases");
    }

    return allDbInserts.map((upvote) => upvote.postId);
  } catch (error) {
    console.error(
      `Error fetching upvotes from database: ${JSON.stringify(error)}`
    );
    return undefined;
  }
}
