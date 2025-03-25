import { useQuery } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { ApiResponse } from "@/types/apiTypes";
import { useAuth } from "./useAuth";
import { fetchWithProxy } from "@/utils/proxyFetch";

interface UseFetchUserUpvotesReturn {
  readonly userUpvotedPostIds: readonly number[];
  readonly loading: boolean;
  readonly error: boolean;
  readonly refetchUserUpvotedPostIds: () => void;
}

export function useFetchUserUpvotes({
  userId,
}: {
  userId: number | undefined;
}): UseFetchUserUpvotesReturn {
  const { toast } = useToast();
  const { userToken } = useAuth();

  const { isPending, isError, data, refetch } = useQuery({
    queryKey: ["userUpvotedPostIds", userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      const response = await fetchWithProxy({
        endpoint: `posts/votes/${userId}`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        toast({
          title: "Error fetching user upvoted posts",
          description: "Please try again later.",
        });
        return;
      }

      const upvotedPostIdsResponse: ApiResponse<readonly number[]> =
        await response.json();
      return upvotedPostIdsResponse.data;
    },
  });

  return {
    userUpvotedPostIds: data ?? [],
    loading: isPending,
    error: isError,
    refetchUserUpvotedPostIds: refetch,
  };
}
