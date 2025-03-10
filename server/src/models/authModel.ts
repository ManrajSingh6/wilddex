import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { usersTable } from "../db/schema";
import { User } from "../types";
import { dbClient } from "../index";
import * as bcryptjs from "bcryptjs";

const SALT_ROUNDS = 10;

const JWT_SECRET = process.env.JWT_SECRET || "";

export async function getHashedPassword(password: string): Promise<string> {
  return await bcryptjs.hash(password, SALT_ROUNDS);
}

export async function addUserAccount(
  email: string,
  name: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const insert: typeof usersTable.$inferInsert = {
      email,
      name,
      password: hashedPassword,
    };

    await dbClient.insert(usersTable).values(insert);
    return true;
  } catch (error) {
    console.error(`Error creating user account: ${JSON.stringify(error)}`);
    return false;
  }
}

export async function getUserById(id: number): Promise<User | undefined> {
  try {
    return await dbClient.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
    });
  } catch (error) {
    console.error(
      `Error fetching user from database by id (${id}): ${JSON.stringify(
        error
      )}`
    );
    return undefined;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    return await dbClient.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
  } catch (error) {
    console.error(
      `Error fetching user from database by email (${email}): ${JSON.stringify(
        error
      )}`
    );
    return undefined;
  }
}

export async function doUserPasswordsMatch(
  userId: number,
  inputPassword: string
): Promise<boolean> {
  try {
    const [row] = await dbClient
      .select({
        password: usersTable.password,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!row) {
      throw new Error(`User with id ${userId} not found`);
    }

    return await bcryptjs.compare(inputPassword, row.password);
  } catch (error) {
    console.error(
      `Error fetching checking password for userId (${userId}): ${JSON.stringify(
        error
      )}`
    );
    return false;
  }
}

export function getSignedJwtToken(user: User): string {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: "1d",
  });
}

export function verifyToken(token: string): User | undefined {
  try {
    const decodedToken: User = jwt.verify(token, JWT_SECRET) as User;
    return decodedToken;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}
