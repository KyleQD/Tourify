import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLaunchCapabilityAvailable } from "@/lib/config/launch-capabilities";

export default function CooperativeLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isLaunchCapabilityAvailable("creator_cooperative")) notFound();

  return children;
}
