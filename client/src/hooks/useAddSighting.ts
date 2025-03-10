import { AddSightingFormData } from "@/components/addSightingModal";
import { useToast } from "./use-toast";
import { useMutation } from "@tanstack/react-query";
import { BASE_API_URL } from "@/App";
import { useAuth } from "./useAuth";

type NewSightingInput = AddSightingFormData & { userId: number };

interface UseAddSightingReturn {
  readonly addSighting: (sighting: NewSightingInput) => Promise<void>;
  readonly loading: boolean;
  readonly error: boolean;
}

export function useAddSighting(): UseAddSightingReturn {
  const { toast } = useToast();
  const { userToken } = useAuth();

  const addSightMutation = useMutation({
    mutationFn: async (sighting: NewSightingInput) => {
      if (!sighting.location || !sighting.encodedImage) {
        throw new Error("Missing location or image data.");
      }

      const response = await fetch(`${BASE_API_URL}/posts/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          userId: sighting.userId,
          notes: sighting.notes ?? undefined,
          encodedImage: sighting.encodedImage,
          timestamp: sighting.timestamp,
          latitude: sighting.location.lat,
          longitude: sighting.location.lng,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Nice Work!",
        description: "Sighting added successfully.",
      });
    },
    onError: (errorResponse) => {
      toast({
        title: "Error adding sighting.",
        description:
          errorResponse.message || "There was an error adding the sighting.",
      });
    },
  });

  async function addSighting(sighting: NewSightingInput): Promise<void> {
    await addSightMutation.mutateAsync(sighting);
  }

  return {
    addSighting,
    loading: addSightMutation.isPending,
    error: addSightMutation.isError,
  };
}
