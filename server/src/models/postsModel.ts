import { and, eq } from "drizzle-orm";
import { dbClient } from "../index";
import { postsTable, upvotesTable } from "../db/schema";
import { CreatePostInsert, Post } from "../types";

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
    const posts = await dbClient.query.postsTable.findMany();

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
    const posts = await dbClient.query.postsTable.findMany({
      where: eq(postsTable.userId, userId),
    });

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
    const postInsert = await dbClient
      .insert(postsTable)
      .values(insert)
      .returning();

    if (postInsert.length < 1) {
      throw new Error(`PostInsert Return Length: ${postInsert.length}`);
    }

    const createdPost = postInsert[0];

    const postUpvotes = await getPostUpvotes(createdPost.id);
    if (postUpvotes === undefined) {
      throw new Error(
        `Error fetching post upvotes for Post ID: ${createdPost.id}`
      );
    }

    return { ...createdPost, upvotes: postUpvotes };
  } catch (error) {
    console.error(`Error creating post in database: ${JSON.stringify(error)}`);
    return undefined;
  }
}

export async function getPostUpvotes(
  postId: number
): Promise<number | undefined> {
  try {
    const upvotes = await dbClient
      .select()
      .from(upvotesTable) // replace with the actual table holding likes/upvotes
      .where(eq(upvotesTable.postId, postId));

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
