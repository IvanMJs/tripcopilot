import { track } from "@vercel/analytics";

/**
 * Typed wrapper around Vercel Analytics track().
 * Call these at the moment the user completes an action.
 */
export const analytics = {
  flightAdded(props: { airline: string; origin: string; destination: string }) {
    track("flight_added", props);
  },
  flightImported(props: { count: number }) {
    track("flight_imported", props);
  },
  flightRemoved() {
    track("flight_removed");
  },
  accommodationAdded(props: { via: "manual" | "ai" }) {
    track("accommodation_added", props);
  },
  tripCreated() {
    track("trip_created");
  },
  tripDuplicated() {
    track("trip_duplicated");
  },
  tripDeleted() {
    track("trip_deleted");
  },
  calendarExported() {
    track("calendar_exported");
  },
  sharedWhatsApp() {
    track("shared_whatsapp");
  },
  sharedLink() {
    track("shared_link");
  },
  pushPermissionGranted() {
    track("push_permission_granted");
  },
  copilotUsed(props?: { type?: "copilot" | "assistant" }) {
    track("copilot_used", props ?? {});
  },
  notificationEnabled() {
    track("notification_enabled");
  },
  notificationDisabled() {
    track("notification_disabled");
  },
  shareTrip(props?: { method?: "link" | "whatsapp" | "pdf" }) {
    track("share_trip", props ?? {});
  },
  paymentCompleted(props?: { plan?: string }) {
    track("payment_completed", props ?? {});
  },
};
