import { assignBadgeToUser, doesUserHaveBadge } from "../models/badgeModel";
import { getPostsByUserId, getPostUpvotesByUserId } from "../models/postsModel";
import { Badge } from "../types";

export interface BadgeRule {
  badgeId: number;
  qualifies: (userId: number) => Promise<boolean>;
}

export const POSSIBLE_BADGES: readonly Omit<Badge, "userId" | "dateEarned">[] =
  [
    {
      id: 1,
      title: "Level 1",
      description:
        "You've earned your first badge! Nice work on your first post.",
      imageUrl:
        "https://rljkmgjfdqqolgyolhwv.supabase.co/storage/v1/object/public/wilddex-images/uploads/badge1.jpg",
    },
    {
      id: 2,
      title: "Level 2",
      description: "You've earned your first upvote! Keep up the good work.",
      imageUrl:
        "https://rljkmgjfdqqolgyolhwv.supabase.co/storage/v1/object/public/wilddex-images/uploads/badge2.jpg",
    },
    {
      id: 3,
      title: "Level 3",
      description: "Nice work on 5 posts! You're really making a difference.",
      imageUrl:
        "https://rljkmgjfdqqolgyolhwv.supabase.co/storage/v1/object/public/wilddex-images/uploads/badge3.jpg",
    },
  ];

const firstPostRule: BadgeRule = {
  badgeId: 1,
  qualifies: async (userId: number) => {
    const postsByUser = await getPostsByUserId(userId);

    if (postsByUser === undefined) {
      return false;
    }

    return postsByUser.length === 1;
  },
};

const firstUpvoteRule: BadgeRule = {
  badgeId: 2,
  qualifies: async (userId: number) => {
    const upvotesByUser = await getPostUpvotesByUserId(userId);
    if (!upvotesByUser) {
      return false;
    }

    return upvotesByUser.length === 1;
  },
};

const fivePostsRule: BadgeRule = {
  badgeId: 1,
  qualifies: async (userId: number) => {
    const postsByUser = await getPostsByUserId(userId);

    if (postsByUser === undefined) {
      return false;
    }

    return postsByUser.length === 5;
  },
};

const BADGE_RULES: readonly BadgeRule[] = [
  firstPostRule,
  firstUpvoteRule,
  fivePostsRule,
];

async function awardBadge(userId: number, badgeId: number): Promise<boolean> {
  const badge = POSSIBLE_BADGES.find((b) => b.id === badgeId);

  if (!badge) {
    return false;
  }

  const assignSuccess = await assignBadgeToUser({
    id: badge.id,
    userId,
    title: badge.title,
    description: badge.description,
    imageUrl: badge.imageUrl,
  });

  return assignSuccess;
}

export async function checkAndAwardBadges(userId: number): Promise<void> {
  for (const rule of BADGE_RULES) {
    const userQualifiesRule = await rule.qualifies(userId);
    const userHasBadge = await doesUserHaveBadge(rule.badgeId, userId);
    if (userQualifiesRule && !userHasBadge) {
      const awardSuccess = await awardBadge(userId, rule.badgeId);
      if (!awardSuccess) {
        console.error(`Error awarding badge to user ${userId}`);
      }
    }
  }
}
