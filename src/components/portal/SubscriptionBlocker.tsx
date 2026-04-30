"use client";

interface Props {
  children: React.ReactNode;
}

// Subscription gating is currently disabled — any logged-in member can
// access the portal regardless of subscription state. To re-enable, restore
// the previous version of this file from git history (it queried the latest
// active subscription and rendered a lock screen when expired beyond the
// grace window).
export function SubscriptionBlocker({ children }: Props) {
  return <>{children}</>;
}
