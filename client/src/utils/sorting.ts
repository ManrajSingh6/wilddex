import { DropdownOption } from "@/components/dropdown";
import { Post } from "@/types/postTypes";

export const DROPDOWN_SORT_OPTIONS: readonly DropdownOption[] = [
  {
    label: "Newest",
    value: "newest",
  },
  {
    label: "Popular",
    value: "popular",
  },
];

export const DEFAULT_SORT_OPTION = DROPDOWN_SORT_OPTIONS[0];

export function getSortedPosts(
  posts: readonly Post[],
  sortOption: string
): readonly Post[] {
  if (sortOption === "newest") {
    return [...posts].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else {
    return [...posts].sort((a, b) => b.upvotes - a.upvotes);
  }
}
