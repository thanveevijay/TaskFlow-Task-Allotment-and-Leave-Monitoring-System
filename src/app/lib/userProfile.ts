import type { LoginResponse } from "../api/auth";

const KEY = "userProfile";

/** Fired when `setStoredUserProfile` runs so shell UI (e.g. header) can sync without a full reload. */
export const USER_PROFILE_UPDATED_EVENT = "taskflow-user-profile-updated";

export type StoredUserProfile = LoginResponse["employee"];

export function getStoredUserProfile(): StoredUserProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUserProfile;
  } catch {
    return null;
  }
}

export function setStoredUserProfile(profile: StoredUserProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT, { detail: profile }));
  }
}

export function clearStoredUserProfile() {
  localStorage.removeItem(KEY);
}
