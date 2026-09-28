import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLaunchCapabilityAvailable } from "@/lib/config/launch-capabilities";

export default function TreatyLegacyLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isLaunchCapabilityAvailable("creator_treaty_system_legacy"))
    notFound();

  return children;
}
