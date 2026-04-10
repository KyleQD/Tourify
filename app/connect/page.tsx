"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CreateSessionResponse {
  connectSessionId: string
  ephemeralToken: string
  expiresAt: string
  claimUrl: string
  webClaimUrl: string
  deepLinkUrl: string
}

export default function ConnectHubPage() {
  const router = useRouter()
  const [manualInput, setManualInput] = useState("")
  const [activeSession, setActiveSession] = useState<CreateSessionResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [isStartPending, startStartTransition] = useTransition()
  const [isSharePending, startShareTransition] = useTransition()

  const normalizedToken = useMemo(() => extractConnectToken(manualInput), [manualInput])
  const hasClaimableToken = normalizedToken.length > 20

  function startConnectSession() {
    startStartTransition(async () => {
      setErrorMessage("")
      setInfoMessage("")

      const response = await fetch("/api/connect/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handshakeMethod: "nfc_ble",
          oneTimeClaim: true,
          expiresInSeconds: 120,
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        setActiveSession(null)
        setErrorMessage(json?.error?.message || "Failed to start connect session.")
        return
      }

      setActiveSession(json)
      setInfoMessage("Connect session created. Share the web link or deep link with someone nearby.")
      void sendConnectTelemetry({
        eventName: "connect_flow_session_created_web",
        connectSessionId: json.connectSessionId,
      })
    })
  }

  function shareSession() {
    if (!activeSession) {
      setErrorMessage("No active session. Start one first.")
      return
    }

    const message = [
      "Connect with me on Tourify:",
      activeSession.webClaimUrl,
      "",
      "Mobile deep link:",
      activeSession.deepLinkUrl,
    ].join("\n")

    startShareTransition(async () => {
      setErrorMessage("")
      setInfoMessage("")

      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await navigator.share({
            title: "Tourify connect",
            text: message,
            url: activeSession.webClaimUrl,
          })
          setInfoMessage("Session link shared.")
          void sendConnectTelemetry({
            eventName: "connect_flow_session_shared_web",
            connectSessionId: activeSession.connectSessionId,
          })
          return
        } catch {
          // fall through to clipboard path
        }
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message)
        setInfoMessage("Session link copied to clipboard.")
        void sendConnectTelemetry({
          eventName: "connect_flow_session_copied_web",
          connectSessionId: activeSession.connectSessionId,
        })
        return
      }

      setInfoMessage("Copy and share this link manually.")
    })
  }

  function openClaimFlow() {
    if (!hasClaimableToken) {
      setErrorMessage("Paste a valid token or claim URL.")
      return
    }

    router.push(`/connect/claim?token=${encodeURIComponent(normalizedToken)}`)
    void sendConnectTelemetry({
      eventName: "connect_flow_claim_opened_web",
    })
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>In-person Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Start a short-lived session and share it nearby, or paste a received link to claim and confirm.
          </p>

          {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          {infoMessage && <p className="text-sm text-green-500">{infoMessage}</p>}

          <div className="space-y-3 rounded-md border p-4">
            <p className="text-sm font-medium">Start and share</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={startConnectSession} disabled={isStartPending}>
                {isStartPending ? "Starting session..." : "Start in-person session"}
              </Button>
              <Button onClick={shareSession} variant="outline" disabled={isSharePending}>
                {isSharePending ? "Preparing..." : "Share active session"}
              </Button>
            </div>

            {activeSession && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Web link: {activeSession.webClaimUrl}</p>
                <p>Deep link: {activeSession.deepLinkUrl}</p>
                <p>Expires at: {new Date(activeSession.expiresAt).toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-md border p-4">
            <p className="text-sm font-medium">Claim incoming session</p>
            <input
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              placeholder="Paste connect token or claim URL"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={openClaimFlow} disabled={!hasClaimableToken}>
                Open claim flow
              </Button>
              <Link href="/connect/claim">
                <Button variant="outline">Open claim page</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function extractConnectToken(rawValue: string) {
  const trimmedValue = rawValue.trim()
  if (!trimmedValue) return ""

  if (!looksLikeUrl(trimmedValue))
    return trimmedValue

  try {
    const parsedUrl = new URL(trimmedValue)
    return parsedUrl.searchParams.get("token")?.trim() || ""
  } catch {
    return parseTokenFromLooseQuery(trimmedValue)
  }
}

function looksLikeUrl(value: string) {
  return value.includes("://") || value.startsWith("http://") || value.startsWith("https://")
}

function parseTokenFromLooseQuery(value: string) {
  const queryStartIndex = value.indexOf("?")
  if (queryStartIndex < 0) return ""
  const params = new URLSearchParams(value.slice(queryStartIndex + 1))
  return params.get("token")?.trim() || ""
}

async function sendConnectTelemetry(payload: {
  eventName: string
  connectSessionId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await fetch("/api/connect/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: payload.eventName,
        connectSessionId: payload.connectSessionId,
        platform: "web",
        metadata: payload.metadata || {},
      }),
    })
  } catch {
    // Telemetry should never block UX
  }
}
