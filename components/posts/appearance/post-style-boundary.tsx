"use client";

import type { CSSProperties } from "react";
import type { PostCompiledAppearance } from "@/lib/appearance/compile";
import styles from "./post-style-boundary.module.css";
import { cn } from "@/lib/utils";

interface PostStyleBoundaryProps {
  postId: string;
  templateId: string;
  templateVersion: number;
  compiled: PostCompiledAppearance;
  children: React.ReactNode;
  surface?: string;
  articleProps?: React.HTMLAttributes<HTMLElement>;
}

export function PostStyleBoundary({
  postId,
  templateId,
  templateVersion,
  compiled,
  children,
  surface = "feed",
  articleProps,
}: PostStyleBoundaryProps) {
  // The CSS variables set here flow into child elements.
  // --post-card-bg / --post-card-text / --post-card-border are consumed by the
  // styled card wrapper below to override any hardcoded Tailwind classes.
  const rootStyle: CSSProperties = {
    ...compiled.cssVariables,
    isolation: "isolate",
    overflow: "hidden",
    position: "relative",
    contain: "paint",
  };

  // Apply the skin's card colors directly on the outer element so they
  // override hardcoded Tailwind bg-*/text-* classes on child Card components.
  const cardOverrideStyle: CSSProperties = {
    backgroundColor: "var(--post-card-bg)",
    color: "var(--post-card-text)",
    borderColor: "var(--post-card-border)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "inherit",
  };

  return (
    <article
      {...articleProps}
      data-post-id={postId}
      data-post-appearance
      data-template={templateId}
      data-template-version={templateVersion}
      data-post-texture={compiled.textureId}
      data-post-surface={surface}
      className={cn(styles.root, compiled.rootClassName)}
      style={rootStyle}
    >
      {/* Inner div applies card colors as inline styles — wins over Tailwind utility classes */}
      <div data-post-card-skin style={cardOverrideStyle}>
        {children}
      </div>
    </article>
  );
}
