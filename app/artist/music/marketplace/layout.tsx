import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLaunchCapabilityAvailable } from "@/lib/config/launch-capabilities";

export default function ArtistMusicMarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isLaunchCapabilityAvailable("music_finance_offerings")) notFound();

  return children;
}
