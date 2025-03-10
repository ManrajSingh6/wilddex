import { JSX, useEffect, useState } from "react";
import { Container } from "@/components/container";
import { Header } from "@/components/header";
import {
  NewPostNotification,
  NewPostUpvoteNotification,
} from "@/types/notificationTypes";
import { useNotifications } from "@/context/notificationsContext";
import { formatAnimalName, formatFriendlyTimestamp } from "@/utils/formatting";

export function NotificationsPage(): JSX.Element {
  const {
    newPostNotifications,
    newPostUpvoteNotifications,
    markNewPostNotificationAsSeen,
    markNewPostUpvoteNotificationAsSeen,
  } = useNotifications();

  const [localNewPostNotifications, setLocalNewPostNotifications] = useState<
    NewPostNotification[]
  >([]);

  const [localNewPostUpvoteNotifications, setLocalNewPostUpvoteNotifications] =
    useState<NewPostUpvoteNotification[]>([]);

  const newUpvoteNotificationsElems = localNewPostUpvoteNotifications.map(
    (notification) => {
      return {
        timestamp: notification.timestamp,
        postId: notification.postId,
        content: (
          <div
            className="border p-2 rounded-sm text-sm text-black font-normal flex items-center justify-between hover:cursor-pointer"
            onClick={() =>
              markNewPostUpvoteNotificationAsSeen(notification.notificationId)
            }
          >
            <div>
              <p>
                {notification.likedBy.name} liked your sighting:{" "}
                <span className="capitalize font-semibold">
                  {formatAnimalName(notification.postTitle)}
                </span>
              </p>
              <p className="text-xs text-accentText">
                Total Upvotes: {notification.upvoteCount}
              </p>
            </div>
            <p className="font-normal text-accentText">
              {formatFriendlyTimestamp(notification.timestamp)}
            </p>
          </div>
        ),
      };
    }
  );

  const newPostNotificationsElems = localNewPostNotifications.map(
    (notification) => {
      return {
        timestamp: notification.timestamp,
        postId: notification.postId,
        content: (
          <div
            className="border p-2 rounded-sm text-sm text-black font-normal flex items-center justify-between hover:cursor-pointer"
            onClick={() =>
              markNewPostNotificationAsSeen(notification.notificationId)
            }
          >
            <p>
              {notification.postedBy.name} just added a new sighting:{" "}
              <span className="capitalize font-semibold">
                {formatAnimalName(notification.postTitle)}
              </span>
            </p>
            <p className="font-normal text-accentText">
              {formatFriendlyTimestamp(notification.timestamp)}
            </p>
          </div>
        ),
      };
    }
  );

  const sortedElements = [
    ...newUpvoteNotificationsElems,
    ...newPostNotificationsElems,
  ].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  useEffect(() => {
    console.log("New Post Notifications IN HERERE: ", newPostNotifications);
    console.log(
      "New Post Upvote Notifications IN HERERE: ",
      newPostUpvoteNotifications
    );

    setLocalNewPostNotifications(newPostNotifications);
    setLocalNewPostUpvoteNotifications(newPostUpvoteNotifications);
  }, [newPostNotifications, newPostUpvoteNotifications]);

  return (
    <Container className="w-3/5 m-auto">
      <Header header={`Notifications (${sortedElements.length})`} />
      <ul className="space-y-2 mt-4">
        {sortedElements.map((item) => {
          return item.content;
        })}
        {}
      </ul>
    </Container>
  );
}
