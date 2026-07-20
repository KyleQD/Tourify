export function validateNewPassword(params: {
  password: string
  confirmPassword: string
}): { ok: true } | { ok: false; message: string } {
  if (params.password.length < 8)
    return { ok: false, message: "Use at least 8 characters." }

  if (params.password !== params.confirmPassword)
    return { ok: false, message: "Passwords do not match." }

  return { ok: true }
}
