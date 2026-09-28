import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLaunchCapabilityAvailable } from "@/lib/config/launch-capabilities";

export default function TreatyOperationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isLaunchCapabilityAvailable("creator_multilateral_treaty_operations"))
    notFound();

  return children;
}