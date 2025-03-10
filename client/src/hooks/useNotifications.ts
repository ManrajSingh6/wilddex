import { socket } from "@/socket";
import {
  NewPostNotification,
  NewPostUpvoteNotification,
} from "@/types/notificationTypes";
import { useEffect, useState } from "react";

interface UseNotificationsReturn {
  readonly newPostNotifications: NewPostNotification[];
  readonly newPostUpvoteNotifications: NewPostUpvoteNotification[];
}

export function useNotifications(): UseNotificationsReturn {
  const [newPostNotifications, setNewPostNotifications] = useState<
    NewPostNotification[]
  >([]);
  const [newPostUpvoteNotifications, setNewPostUpvoteNotifications] = useState<
    NewPostUpvoteNotification[]
  >([]);

  useEffect(() => {
    socket.on("new-upvote", (newUpvoteNotif: NewPostUpvoteNotification) => {
      console.log("New Upvote Notification: ", newUpvoteNotif);
      setNewPostUpvoteNotifications((prev) => [...prev, newUpvoteNotif]);
    });

    socket.on("new-post", (newPostNotif: NewPostNotification) => {
      console.log("New Post Notification: ", newPostNotif);
      setNewPostNotifications((prev) => [...prev, newPostNotif]);
    });

    return () => {
      socket.off("new-upvote");
      socket.off("new-post");
    };
  }, []);

  return { newPostNotifications, newPostUpvoteNotifications };
}
