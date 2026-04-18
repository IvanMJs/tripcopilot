export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export const RESERVED_USERNAMES = [
  "admin",
  "api",
  "app",
  "www",
  "support",
  "help",
  "info",
  "mail",
  "root",
  "system",
  "null",
  "tripcopilot",
  "tripsocial",
];

export function isValidUsername(u: string): boolean {
  return USERNAME_REGEX.test(u) && !RESERVED_USERNAMES.includes(u.toLowerCase());
}
