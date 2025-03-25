import { useMutation } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";
import { fetchWithProxy } from "@/utils/proxyFetch";

interface PostVoteRequest {
  postId: number;
  operation: "increment" | "decrement";
}

interface UseVotePostReturn {
  readonly votePost: (input: PostVoteRequest) => Promise<void>;
  readonly loading: boolean;
  readonly error: boolean;
}

export function useVotePost({
  userId,
  onSuccess,
}: {
  userId: number | undefined;
  onSuccess?: () => void;
}): UseVotePostReturn {
  const { toast } = useToast();
  const { userToken } = useAuth();

  const votePostMutation = useMutation({
    mutationFn: async ({ postId, operation }: PostVoteRequest) => {
      const response = await fetchWithProxy({
        endpoint: "posts/vote",
        method: "POST",
        body: JSON.stringify({ id: postId, operation, userId }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      return await response.json();
    },

    onSuccess: () => {
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (erroResponse) => {
      toast({
        title: "Error liking post.",
        description: erroResponse.message || "Please try again later.",
      });
    },
  });

  async function votePost(input: PostVoteRequest) {
    await votePostMutation.mutateAsync(input);
  }

  return {
    votePost: votePost,
    loading: votePostMutation.isPending,
    error: votePostMutation.isError,
  };
}
