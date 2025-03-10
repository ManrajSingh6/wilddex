import "dotenv/config";
import { faker } from "@faker-js/faker";
import { createDbClient } from "./db";
import { usersTable, badgesTable, postsTable, upvotesTable } from "./schema";

const MOCK_BADGE_IMAGES = [
  "https://static.vecteezy.com/system/resources/previews/048/687/322/non_2x/trophy-award-with-stars-in-pixel-art-style-vector.jpg",
  "https://img.freepik.com/premium-vector/trophy-pixel-vector_1050334-10.jpg",
  "https://static.vecteezy.com/system/resources/previews/010/967/102/non_2x/medal-pixel-icon-free-vector.jpg",
];

const dbClient = createDbClient(process.env.DEV_DATABASE_URL ?? "");

async function seedDatabase() {
  console.log("Seeding database...");

  for (let idx = 0; idx < 4; idx++) {
    const person = faker.person;
    const fullName = idx === 1 ? "Clark Kent" : person.fullName();
    const email =
      idx === 1
        ? "test@mail.com"
        : faker.internet.email({
            firstName: fullName.split(" ")[0],
            lastName: fullName.split(" ")[1],
          });

    const userInsert = await dbClient
      .insert(usersTable)
      .values({
        name: fullName,
        email,
        password:
          idx === 1
            ? "$2a$10$qTwB1uJBIrlT53RmP6KDdOY4ds56Dalr6.BLOFIo3wBOfvFyeE81a" // Password is: "pass"
            : faker.internet.password(),
      })
      .returning();

    const user = userInsert[0];

    for (let badgeIdx = 0; badgeIdx < 3; badgeIdx++) {
      await dbClient.insert(badgesTable).values({
        id: badgeIdx + user.id,
        userId: user.id,
        title: `Badge #${badgeIdx + 1}`,
        description: `Nice job! You got a badge for ${badgeIdx + 1}!`,
        imageUrl: MOCK_BADGE_IMAGES[badgeIdx],
      });
    }

    for (let postIdx = 1; postIdx < 4; postIdx++) {
      const type = faker.animal.type();

      const postInsert = await dbClient
        .insert(postsTable)
        .values({
          userId: user.id,
          animal: type,
          notes: `I saw this cool ${type} today in the park!`,
          conservationNotes: faker.lorem.sentences(3),
          imageUrl: getAnimalImageUrl(type),
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          createdAt: faker.date.recent({ days: 30 }),
        })
        .returning();

      const post = postInsert[0];

      const shouldUpvote = faker.datatype.boolean();
      if (shouldUpvote) {
        await dbClient.insert(upvotesTable).values({
          postId: post.id,
          userId: user.id,
        });
      }
    }
  }

  function getAnimalImageUrl(
    animal: string,
    width: number = 400,
    height: number = 400
  ): string {
    return `https://loremflickr.com/${width}/${height}/${animal}`;
  }

  console.log("Database seeded successfully!");
}

seedDatabase()
  .then(() => console.log("Seeding Finished."))
  .catch((err) => console.error("Error seeding database:", err))
  .finally(() => process.exit());
