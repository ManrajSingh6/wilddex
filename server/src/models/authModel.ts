import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { usersTable } from "../db/schema";
import { User } from "../types";
import { activeDBs, dbClient } from "../index";
import * as bcryptjs from "bcryptjs";
import { readFromDatabases, writeToDatabases } from "../db/dbIO";

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
    const allReads = await readFromDatabases(usersTable, { id });

    if (!allReads) {
      throw new Error("Failed to fetch user from all databases");
    }

    const foundUser = allReads.find((user) => user.id === id);

    if (!foundUser) {
      throw new Error(`User with id ${id} not found`);
    }

    return foundUser;
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
    const allReads = await readFromDatabases(usersTable, { email });

    if (!allReads) {
      throw new Error("Failed to fetch user from all databases");
    }

    const foundUser = allReads.find((user) => user.email === email);

    if (!foundUser) {
      throw new Error(`User with id ${email} not found`);
    }

    return foundUser;
  } catch (error) {
    console.error(
      `Error fetching user from database by email (${email}): ${error}`
    );
    return undefined;
  }
}

export async function doUserPasswordsMatch(
  userId: number,
  inputPassword: string
): Promise<boolean> {
  try {
    const foundUsers = await readFromDatabases(usersTable, { id: userId });
    if (!foundUsers) {
      throw new Error("Failed to fetch user from all databases");
    }

    const foundUser = foundUsers.find((user) => user.id === userId);
    if (!foundUser) {
      throw new Error(`User with id ${userId} not found`);
    }

    return await bcryptjs.compare(inputPassword, foundUser.password);
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
