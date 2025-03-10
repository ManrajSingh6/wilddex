import { Container } from "@/components/container";
import { CustomImage } from "@/components/customImage";
import DropdownSelect from "@/components/dropdown";
import { Header } from "@/components/header";
import { PostCard } from "@/components/postCard";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useFetchPosts } from "@/hooks/useFetchPosts";
import { useFetchUserUpvotes } from "@/hooks/useFetchUserUpvotes";
import {
  DEFAULT_SORT_OPTION,
  DROPDOWN_SORT_OPTIONS,
  getSortedPosts,
} from "@/utils/sorting";
import { JSX, useState } from "react";

export function ProfilePage(): JSX.Element {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");

  const { posts: userPosts, refetchPosts } = useFetchPosts({
    userId: user?.id,
  });
  const { userUpvotedPostIds, refetchUserUpvotedPostIds } = useFetchUserUpvotes(
    { userId: user?.id }
  );

  const [sortOption, setSortOption] = useState(DEFAULT_SORT_OPTION);

  const sortedUserPosts = getSortedPosts(userPosts, sortOption.value);

  const filteredPosts = sortedUserPosts.filter((post) =>
    post.animal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <p>Failed to identify user.</p>;
  }

  return (
    <Container className="flex flex-col space-y-4">
      <div className="flex items-center space-x-4 mb-4">
        <CustomImage
          src="https://avatar.iran.liara.run/public/12"
          alt="profile-picture"
          className="w-16 h-16 rounded-full shadow-md border-2 border-slate-300"
        />
        <Header header={user.name} subtext={user.email} />
      </div>
      <div className="flex items-center justify-between">
        <Header header="Your Sightings" />
        <div className="flex items-center gap-4">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            placeholder="Search by animal..."
            className="min-w-72"
          />
          <DropdownSelect
            selectedOption={sortOption}
            options={DROPDOWN_SORT_OPTIONS}
            setSelectedOption={(opt) =>
              setSortOption(
                DROPDOWN_SORT_OPTIONS.find((o) => o.value === opt) ||
                  DEFAULT_SORT_OPTION
              )
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 mt-4">
        {filteredPosts.length ? (
          filteredPosts.map((post) => {
            return (
              <PostCard
                key={post.id}
                post={post}
                isUpvotedByUser={userUpvotedPostIds.includes(post.id)}
                userId={user.id}
                onVoteSuccess={() => {
                  refetchPosts();
                  refetchUserUpvotedPostIds();
                }}
              />
            );
          })
        ) : (
          <p className="text-sm text-header">No posts available.</p>
        )}
      </div>
    </Container>
  );
}
