import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compilePostAppearance } from "@/lib/appearance/compile";
import { sanitizePostStyleConfiguration } from "@/lib/appearance/sanitize";
import {
  createPostAppearanceSnapshotV3,
  resolvePostAppearanceSnapshot,
} from "@/lib/post-appearance/resolve";
import {
  getActiveTemplates,
  getDefaultPostStyleConfiguration,
} from "@/lib/post-appearance/template-registry";
import {
  ANIMATED_POST_TEXTURES,
  STATIC_POST_TEXTURES,
  isPostTextureId,
} from "@/lib/post-appearance/texture-skins";

describe("premiere post styles schema V3", () => {
  it("sanitizes every premiere default and compiles its treatment variables", () => {
    for (const template of getActiveTemplates()) {
      const defaults = getDefaultPostStyleConfiguration(template.id);
      expect(defaults).not.toBeNull();
      const sanitized = sanitizePostStyleConfiguration(defaults, template.id);
      const compiled = compilePostAppearance(
        template.id,
        sanitized.appearance,
        sanitized,
      );
      expect(compiled.rootClassName).toContain(
        `post-layout-${template.layoutId}`,
      );
      expect(
        compiled.cssVariables[
          "--post-pattern-size" as keyof typeof compiled.cssVariables
        ],
      ).toBeTruthy();
      expect(isPostTextureId(compiled.textureId)).toBe(true);
    }
  });

  it("clamps numeric controls and rejects arbitrary fonts and palette IDs", () => {
    const sanitized = sanitizePostStyleConfiguration(
      {
        paletteId: "javascript:bad",
        typography: {
          headingFont: "url(evil)",
          bodyFont: "mono",
          case: "loud",
          tracking: "huge",
        },
        treatment: {
          intensity: 999,
          patternScale: -4,
          angle: 999,
          distress: -2,
          registrationOffset: 40,
          invert: true,
        },
      },
      "risograph",
    );
    expect(sanitized.paletteId).toBe("tomato-blue");
    expect(sanitized.typography.headingFont).toBe("slab");
    expect(sanitized.treatment.intensity).toBe(100);
    expect(sanitized.treatment.patternScale).toBe(4);
    expect(sanitized.treatment.angle).toBe(45);
    expect(sanitized.treatment.distress).toBe(0);
    expect(sanitized.treatment.registrationOffset).toBe(8);
    expect(sanitized.treatment.invert).toBe(false);
  });

  it("round-trips a V3 immutable snapshot through the shared resolver", () => {
    const defaults = getDefaultPostStyleConfiguration("terminal")!;
    const snapshot = createPostAppearanceSnapshotV3("terminal", defaults);
    const resolved = resolvePostAppearanceSnapshot(snapshot);
    expect(resolved.schemaVersion).toBe(3);
    expect(resolved.configuration?.treatment.patternScale).toBe(
      defaults.treatment.patternScale,
    );
    expect(resolved.semantic.layoutId).toBe("terminal");
  });

  it("migration expands the database check without rewriting snapshots", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260731233358_premiere_post_styles_v3.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("schema_version in (1, 2, 3)");
    expect(sql).not.toMatch(/update\s+public\.post_appearances/i);
  });

  it("keeps attached media visually neutral inside every premiere frame", () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        "components/posts/appearance/post-style-boundary.module.css",
      ),
      "utf8",
    );
    expect(css).toContain(".root :global([data-post-media])");
    expect(css).toContain("filter: none !important");
    expect(css).toContain("mix-blend-mode: normal !important");
    expect(css).toContain("transform: none !important");
  });

  it("gives every premiere style a dedicated full-card treatment", () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        "components/posts/appearance/post-style-boundary.module.css",
      ),
      "utf8",
    );
    for (const template of getActiveTemplates()) {
      expect(css).toContain(`[data-template="${template.id}"]`);
      expect(css).toMatch(
        new RegExp(
          `\\.root\\[data-template="${template.id}"\\]\\s+:global\\(\\[data-post-region="content"\\] > \\*\\)`,
        ),
      );
    }

    const frame = readFileSync(
      resolve(
        process.cwd(),
        "components/posts/appearance/post-template-adapter.tsx",
      ),
      "utf8",
    );
    expect(frame).toContain("data-post-premiere-rail");
    expect(frame).toContain("data-post-premiere-corner");
  });

  it("offers 12 static and four animated texture skins with distinct defaults", () => {
    expect(STATIC_POST_TEXTURES).toHaveLength(12);
    expect(ANIMATED_POST_TEXTURES).toHaveLength(4);
    expect(
      new Set(STATIC_POST_TEXTURES.map((texture) => texture.id)).size,
    ).toBe(12);
    expect(
      new Set(ANIMATED_POST_TEXTURES.map((texture) => texture.id)).size,
    ).toBe(4);
    expect(ANIMATED_POST_TEXTURES.every((texture) => texture.animated)).toBe(
      true,
    );

    const defaults = getActiveTemplates().map(
      (template) => getDefaultPostStyleConfiguration(template.id)?.textureId,
    );
    expect(defaults.every(isPostTextureId)).toBe(true);
    expect(new Set(defaults).size).toBe(8);
  });

  it("sanitizes unknown texture IDs and compiles a scoped texture selector", () => {
    const defaults = getDefaultPostStyleConfiguration("risograph")!;
    const sanitized = sanitizePostStyleConfiguration(
      { ...defaults, textureId: "url(https://evil.example/texture.gif)" },
      "risograph",
    );
    expect(sanitized.textureId).toBe("paper-fiber");

    const compiled = compilePostAppearance(
      "risograph",
      sanitized.appearance,
      sanitized,
    );
    expect(compiled.textureId).toBe("paper-fiber");

    const css = readFileSync(
      resolve(
        process.cwd(),
        "components/posts/appearance/post-style-boundary.module.css",
      ),
      "utf8",
    );
    for (const texture of [
      ...STATIC_POST_TEXTURES,
      ...ANIMATED_POST_TEXTURES,
    ]) {
      expect(css).toContain(`[data-post-texture="${texture.id}"]`);
    }
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important");
  });
});
