// src/notifications.js
import { getCurrentUserId } from "./api";

function getKey() {
  const uid = getCurrentUserId() || "guest";
  return `endoai_notifications_${uid}`;
}

export function getStoredNotifications() {
  try {
    return JSON.parse(localStorage.getItem(getKey())) || [];
  } catch {
    return [];
  }
}

export function saveStoredNotifications(notifs) {
  try {
    localStorage.setItem(getKey(), JSON.stringify(notifs));
    window.dispatchEvent(new Event("endoai_notifs_updated"));
  } catch (e) {
    console.warn("Notification save error", e);
  }
}

export function pushNotification({ msg, type = "info", caseId = null }) {
  const notifs = getStoredNotifications();
  const newNotif = {
    id: "notif_" + Date.now(),
    caseId,
    msg,
    type,
    time: "Just now",
    timestamp: Date.now(),
    read: false,
  };
  const updated = [newNotif, ...notifs.slice(0, 19)];
  saveStoredNotifications(updated);
  return newNotif;
}