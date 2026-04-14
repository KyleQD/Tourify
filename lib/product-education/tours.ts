import type { ProductTour } from "./types"

export const productTours: ProductTour[] = [
  {
    id: "admin-dashboard-intro",
    audiences: ["admin"],
    steps: [
      {
        id: "welcome",
        title: "Admin overview",
        body: "This tour highlights a few anchors when they exist on screen. Use the Help drawer anytime from the top bar.",
      },
      {
        id: "sidebar",
        title: "Sidebar navigation",
        body: "Jump between modules with the sidebar. Number shortcuts (⌘1–⌘0) mirror the main destinations.",
        anchorId: "admin-sidebar",
        placement: "right",
      },
      {
        id: "help",
        title: "Global help",
        body: "Open Help from the top navigation to search guides across Tourify.",
        anchorId: "global-help",
        placement: "bottom",
      },
    ],
  },
]

export function getTourById(id: string): ProductTour | undefined {
  return productTours.find((t) => t.id === id)
}
