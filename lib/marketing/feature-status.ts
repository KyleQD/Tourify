export type FeatureStatus = "available" | "beta" | "in-development" | "planned"

export const featureStatusMeta: Record<
  FeatureStatus,
  { label: string; description: string; className: string; dot: string }
> = {
  available: {
    label: "Available",
    description: "Live and ready to use.",
    className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    dot: "bg-emerald-400",
  },
  beta: {
    label: "Beta",
    description: "Working in the open beta. Expect rough edges and weekly changes.",
    className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    dot: "bg-cyan-400",
  },
  "in-development": {
    label: "In development",
    description: "Being built now. Not yet available in the beta.",
    className: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    dot: "bg-amber-400",
  },
  planned: {
    label: "Planned",
    description: "On the roadmap. Timing is not committed.",
    className: "border-slate-400/30 bg-slate-500/10 text-slate-300",
    dot: "bg-slate-400",
  },
}

export const featureStatusOrder: FeatureStatus[] = ["available", "beta", "in-development", "planned"]
