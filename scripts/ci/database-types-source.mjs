const PROJECT_REF_PATTERN = /^[a-z0-9]{8,64}$/

export function databaseTypeSource(env = process.env) {
  const source = env.SUPABASE_TYPE_SOURCE || "local"
  const baseArgs = ["gen", "types", "typescript", "--schema", "public"]

  if (source === "local") {
    return { source, label: "manually reconciled local target", args: [...baseArgs, "--local"] }
  }
  if (source === "linked") {
    return { source, label: "explicitly linked Supabase target", args: [...baseArgs, "--linked"] }
  }
  if (source === "project-id") {
    const projectId = env.SUPABASE_TYPE_PROJECT_ID
    if (!PROJECT_REF_PATTERN.test(projectId ?? "")) {
      throw new Error("SUPABASE_TYPE_PROJECT_ID must be set to a valid project ref when SUPABASE_TYPE_SOURCE=project-id")
    }
    return {
      source,
      label: "explicit Supabase project-id target",
      args: [...baseArgs, "--project-id", projectId],
    }
  }

  throw new Error("SUPABASE_TYPE_SOURCE must be one of: local, linked, project-id")
}
