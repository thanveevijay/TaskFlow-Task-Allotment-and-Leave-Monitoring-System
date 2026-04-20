import { api } from "./http";

export type OnboardingItem = {
  id: string;
  itemKey: string;
  isComplete: boolean;
  completedAt: string | null;
};

export async function getOnboardingChecklist(): Promise<OnboardingItem[]> {
  const res = await api.get<OnboardingItem[]>("/onboarding-checklist");
  return res.data;
}

export async function acknowledgePolicy(): Promise<void> {
  await api.post("/onboarding-checklist/acknowledge-policy");
}

export async function getOnboardingChecklistFor(userId: string): Promise<OnboardingItem[]> {
  const res = await api.get<OnboardingItem[]>(`/onboarding-checklist/${userId}`);
  return res.data;
}
