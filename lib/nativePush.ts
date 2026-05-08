import type { NativePushTokenRow } from "@/lib/types";

interface NativeNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendNativePush(
  tokens: NativePushTokenRow[],
  notification: NativeNotification,
): Promise<number> {
  const projectId = process.env.FCM_PROJECT_ID;
  const accessToken = process.env.FCM_ACCESS_TOKEN;
  if (!projectId || !accessToken || tokens.length === 0) return 0;

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  let sent = 0;

  await Promise.allSettled(
    tokens.map(async ({ token }) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: notification.title,
                body: notification.body,
              },
              data: notification.data ?? {},
            },
          }),
        });
        if (res.ok) sent++;
        else console.error(`FCM send failed for token ${token.slice(0, 8)}...: ${res.status}`);
      } catch (err) {
        console.error(`FCM send error for token ${token.slice(0, 8)}...:`, err);
      }
    }),
  );

  return sent;
}
