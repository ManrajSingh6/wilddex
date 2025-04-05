import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { usersTable } from "../db/schema";
import { User } from "../types";
import { activeDBs, dbClient } from "../index";
import * as bcryptjs from "bcryptjs";
import { writeToDatabases } from "../db/dbIO";

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

    const allDbInserts = await writeToDatabases(usersTable, insert);

    if (allDbInserts.every((insert) => insert === undefined)) {
      throw new Error("Failed to insert into all databases");
    }

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
    let row;
    for (const client of activeDBs) {
      const res = await client
        .select({
          password: usersTable.password,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (res && res.length > 0) {
        row = res[0];
        break;
      }
    }

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
