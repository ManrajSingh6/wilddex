import { Post } from "@/types/postTypes";
import { JSX, useState } from "react";
import { Container } from "./container";
import { CustomImage } from "./customImage";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { MdOutlineFlipCameraAndroid } from "react-icons/md";
import { formatAnimalName } from "@/utils/formatting";
import { useVotePost } from "@/hooks/useVotePost";

const THREE_DECIMAL_PLACES = 3;

interface PostCardProps {
  readonly post: Post;
  readonly isUpvotedByUser: boolean;
  readonly onVoteSuccess: () => void;
  readonly userId: number;
}

export function PostCard({
  post,
  isUpvotedByUser,
  onVoteSuccess,
  userId,
}: PostCardProps): JSX.Element {
  const [isFlipped, setIsFlipped] = useState(false);

  const [isLiked, setIsLiked] = useState(isUpvotedByUser);

  const { votePost } = useVotePost({ userId, onSuccess: onVoteSuccess });

  async function handleVote(): Promise<void> {
    if (isUpvotedByUser) {
      await votePost({ postId: post.id, operation: "decrement" });
      setIsLiked(false);
      return;
    }

    await votePost({ postId: post.id, operation: "increment" });
    setIsLiked(true);
  }

  return (
    <Container className="relative shadow-md space-y-2 transition-all h-80 md:h-96 lg:h-[370px] overflow-y-auto">
      {!isFlipped ? (
        <>
          <CustomImage
            src={post.imageUrl}
            alt="post-image"
            className="w-full h-[60%] object-cover"
          />
          <p className="text-base text-header font-semibold">
            {formatAnimalName(post.animal)}
          </p>
          <p className="text-sm text-paragraph font-normal">
            Date Seen:{" "}
            <time dateTime={new Date(post.createdAt).toISOString()}>
              {new Date(post.createdAt).toLocaleString()}
            </time>
          </p>
          <p className="text-sm text-paragraph font-normal">
            Lat/Lng: {post.latitude.toFixed(THREE_DECIMAL_PLACES)}/
            {post.longitude.toFixed(THREE_DECIMAL_PLACES)}
          </p>
          <div className="flex items-center space-x-2 justify-between">
            <div className="flex items-center space-x-2 absolute bottom-2 left-2 text-2xl">
              {isLiked ? (
                <FaHeart
                  className="text-red-500 cursor-pointer"
                  onClick={handleVote}
                />
              ) : (
                <FaRegHeart
                  className="text-red-500 cursor-pointer"
                  onClick={handleVote}
                />
              )}
              <span className="text-base text-paragraph font-normal">
                {post.upvotes}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          {post.notes && (
            <>
              <p className="text-base text-header font-semibold">
                Sight Seer's Notes
              </p>
              <p className="text-sm text-paragraph font-normal">{post.notes}</p>
            </>
          )}
          <p className="text-base text-header font-semibold">
            Conservation Notes
          </p>
          <p className="text-sm text-paragraph font-normal">
            {post.conservationNotes}
          </p>
        </>
      )}
      <MdOutlineFlipCameraAndroid
        onClick={() => setIsFlipped((prev) => !prev)}
        className="absolute bottom-2 right-2 text-2xl cursor-pointer hover:text-green-500 transition-all"
      />
    </Container>
  );
}
