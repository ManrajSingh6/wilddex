// src/context/NotificationsContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { socket } from "@/socket";
import {
  NewPostNotification,
  NewPostUpvoteNotification,
} from "@/types/notificationTypes";

interface NotificationsContextProps {
  newPostNotifications: NewPostNotification[];
  newPostUpvoteNotifications: NewPostUpvoteNotification[];
  markNewPostNotificationAsSeen: (notifId: string) => void;
  markNewPostUpvoteNotificationAsSeen: (notifId: string) => void;
}

const NotificationsContext = createContext<
  NotificationsContextProps | undefined
>(undefined);

export const NotificationsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
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

  const markNewPostNotificationAsSeen = (notifId: string) => {
    setNewPostNotifications((prev) =>
      prev.filter((notif) => notif.notificationId !== notifId)
    );
  };

  // Function to mark a new upvote notification as seen by filtering it out
  const markNewPostUpvoteNotificationAsSeen = (notifId: string) => {
    setNewPostUpvoteNotifications((prev) =>
      prev.filter((notif) => notif.notificationId !== notifId)
    );
  };

  return (
    <NotificationsContext.Provider
      value={{
        newPostNotifications,
        newPostUpvoteNotifications,
        markNewPostNotificationAsSeen,
        markNewPostUpvoteNotificationAsSeen,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextProps => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
};
