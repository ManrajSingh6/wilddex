export interface NewPostUpvoteNotification {
  postId: number;
  postTitle: string;
  upvoteCount: number;
  likedBy: {
    userId: number;
    name: string;
  };
  timestamp: Date;
}

export interface NewPostNotification {
  postId: number;
  postTitle: string;
  postedBy: {
    userId: number;
    name: string;
  };
  timestamp: Date;
}
