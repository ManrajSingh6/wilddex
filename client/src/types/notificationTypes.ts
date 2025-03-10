export interface NewPostUpvoteNotification {
  notificationId: string;
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
  notificationId: string;
  postId: number;
  postTitle: string;
  postedBy: {
    userId: number;
    name: string;
  };
  timestamp: Date;
}
