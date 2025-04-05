import { and, eq } from "drizzle-orm";
import { dbClient } from "../index";
import { postsTable, upvotesTable } from "../db/schema";
import { CreatePostInsert, Post } from "../types";
import { readFromDatabases, writeToDatabases } from "../db/dbIO";

export async function getPostById(
  postId: number
): Promise<Post | null | undefined> {
  try {
    const post = await dbClient.query.postsTable.findFirst({
      where: eq(postsTable.id, postId),
    });

    if (!post) {
      return null;
    }

    const postUpvotes = await getPostUpvotes(postId);
    if (postUpvotes === undefined) {
      throw new Error(`Error fetching post upvotes for Post ID: ${postId}`);
    }

    return { ...post, upvotes: postUpvotes };
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

    if (!upvotes) {
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
      await dbClient.insert(upvotesTable).values({
        postId,
        userId,
      });

      const allDbInserts = await writeToDatabases(upvotesTable, {
        postId,
        userId,
      });

      if (allDbInserts.every((insert) => insert === undefined)) {
        throw new Error("Failed to insert into all databases");
      }
    } else {
      await dbClient
        .delete(upvotesTable)
        .where(
          and(eq(upvotesTable.postId, postId), eq(upvotesTable.userId, userId))
        );
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
    const upvote = await dbClient.query.upvotesTable.findFirst({
      where: and(
        eq(upvotesTable.postId, postId),
        eq(upvotesTable.userId, userId)
      ),
    });

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
    const upvotes = await dbClient.query.upvotesTable.findMany({
      where: eq(upvotesTable.userId, userId),
    });

    return upvotes.map((upvote) => upvote.postId);
  } catch (error) {
    console.error(
      `Error fetching upvotes from database: ${JSON.stringify(error)}`
    );
    return undefined;
  }
}
