import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const sidebar = readFileSync(
  join(root, "app/admin/dashboard/components/optimized-sidebar.tsx"),
  "utf8",
)
const sheet = readFileSync(join(root, "components/ui/sheet.tsx"), "utf8")
const actingContext = readFileSync(
  join(root, "app/admin/dashboard/components/admin-acting-context-bar.tsx"),
  "utf8",
)

describe("Admin navigation accessibility contract", () => {
  it("uses one dialog-backed mobile drawer with an accessible name and description", () => {
    expect(sidebar.match(/<SheetContent/g)).toHaveLength(1)
    expect(sidebar).toContain('<SheetTitle className="sr-only">Admin navigation</SheetTitle>')
    expect(sidebar).toContain('<SheetDescription className="sr-only">')
    expect(sidebar).toContain('aria-controls="admin-mobile-navigation"')
    expect(sidebar).toContain("<Sheet modal open={isMobileMenuOpen}")
    expect(sidebar).toContain("onCloseAutoFocus={(event) => {")
    expect(sidebar).toContain("mobileMenuTriggerRef.current?.focus()")
    expect(sidebar).toContain("event.preventDefault()")
    expect(sheet).toContain('import * as SheetPrimitive from "@radix-ui/react-dialog"')
    expect(sheet).toContain("<SheetPrimitive.Overlay")
    expect(sheet).toContain("<SheetPrimitive.Content")
    expect(sheet).toContain("<SheetPrimitive.Close")
  })

  it("uses Next client routing for shortcuts and links", () => {
    expect(sidebar).toContain("const router = useRouter()")
    expect(sidebar).toContain("router.push(item.href)")
    expect(sidebar).not.toContain("window.location.href")
  })

  it("keeps the collapsed rail compact and its controls named", () => {
    expect(sidebar).toContain("<CollapsedCategory")
    expect(sidebar).toContain('aria-label={`${item.label} menu`}')
    expect(sidebar).toContain('aria-label={collapsed ? item.label : undefined}')
    expect(sidebar).toContain('aria-label={collapsed ? "Expand Admin navigation" : "Collapse Admin navigation"}')
    expect(sidebar).not.toContain("{collapsed && hasChildren && (")
  })

  it("reduces stable scope height while keeping the acting identity visible", () => {
    expect(actingContext).toContain('<p className="sr-only">Acting organization</p>')
    expect(actingContext).toContain('{label}</p>')
    expect(actingContext).toContain("px-3 py-2")
    expect(actingContext).toContain("h-8 w-8")
    expect(actingContext).not.toContain("flex-col gap-3")
  })
})
