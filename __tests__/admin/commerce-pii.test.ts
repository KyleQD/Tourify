import { describe, expect, it } from "vitest"

import {
  buildCommercePiiAwareSelect,
  canViewCommercePiiField,
  COMMERCE_PII_FIELD_REQUIREMENTS,
  projectCommercePiiValue,
} from "@/lib/admin/commerce/pii"
import { createCommerceContextFromAdmin } from "@/lib/admin/commerce/context"
import type { ActingAdminContext } from "@/lib/auth/admin-context"

const adminContext: ActingAdminContext = {
  userId: "user-a",
  profileId: "profile-a",
  accountType: "organization",
  orgId: "org-a",
  membershipRole: "support",
  capabilities: ["commerce.view"],
  source: "header",
  scope: "organization",
  allowedTourIds: [],
  correlationId: "request-pii",
}

describe("COM-030 Commerce PII projection", () => {
  it("maps customer and seller PII fields to field-level permissions", () => {
    expect(COMMERCE_PII_FIELD_REQUIREMENTS["customer.email"].requiredPermission)
      .toBe("commerce.view_customers")
    expect(COMMERCE_PII_FIELD_REQUIREMENTS["seller.payout_destination"].requiredPermission)
      .toBe("commerce.view_seller_pii")
  })

  it("redacts PII values unless the context has the required permission", () => {
    const viewOnly = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.view"],
    })
    const customerAccess = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.view_customers"],
    })

    expect(canViewCommercePiiField(viewOnly, "customer.email")).toBe(false)
    expect(projectCommercePiiValue(viewOnly, "customer.email", "buyer@example.com")).toBeNull()
    expect(canViewCommercePiiField(customerAccess, "customer.email")).toBe(true)
    expect(projectCommercePiiValue(customerAccess, "customer.email", "buyer@example.com"))
      .toBe("buyer@example.com")
  })

  it("omits PII columns from select lists without the required permission", () => {
    const sellerAccess = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.view_seller_pii"],
    })
    const viewOnly = createCommerceContextFromAdmin({
      admin: adminContext,
      permissions: ["commerce.view"],
    })

    expect(buildCommercePiiAwareSelect(viewOnly, ["id", "username"], {
      "customer.email": "email",
      "seller.email": "seller_email",
    })).toBe("id, username")
    expect(buildCommercePiiAwareSelect(sellerAccess, ["id", "username"], {
      "customer.email": "email",
      "seller.email": "seller_email",
    })).toBe("id, username, seller_email")
  })
})
