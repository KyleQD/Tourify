import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLaunchCapabilityAvailable } from "@/lib/config/launch-capabilities";

export default function FederationLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isLaunchCapabilityAvailable("creator_federation")) notFound();

  return children;
}
