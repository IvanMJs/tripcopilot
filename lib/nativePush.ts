import { createSign } from "crypto";
import type { NativePushTokenRow } from "@/lib/types";

interface NativeNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function base64url(data: string | Buffer): string {
  const b = typeof data === "string" ? Buffer.from(data) : data;
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: sa.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  );

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = base64url(sign.sign(sa.private_key));

  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    throw new Error(`OAuth2 token exchange failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export async function sendNativePush(
  tokens: NativePushTokenRow[],
  notification: NativeNotification,
): Promise<number> {
  const projectId = process.env.FCM_PROJECT_ID;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!projectId || !saJson || tokens.length === 0) return 0;

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(saJson);
  } catch {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT");
    return 0;
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(sa);
  } catch (err) {
    console.error("Failed to get FCM access token:", err);
    return 0;
  }

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
