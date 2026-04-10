import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { AppState, Text, View } from "react-native"
import { checkApiConnectivity, flushQueuedApiRequests, getOfflineQueueSize } from "@/lib/api/client"

interface ConnectivityContextValue {
  isOnline: boolean
  queueSize: number
  isSyncing: boolean
  refreshConnectivity: () => Promise<void>
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null)

const CHECK_INTERVAL_MS = 15000

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [queueSize, setQueueSize] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const refreshConnectivity = useCallback(async () => {
    const online = await checkApiConnectivity()
    setIsOnline(online)

    if (!online) {
      const queuedCount = await getOfflineQueueSize()
      setQueueSize(queuedCount)
      return
    }

    setIsSyncing(true)
    try {
      const syncResult = await flushQueuedApiRequests()
      setQueueSize(syncResult.remaining)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    void refreshConnectivity()

    const interval = setInterval(() => {
      void refreshConnectivity()
    }, CHECK_INTERVAL_MS)

    const appStateListener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refreshConnectivity()
    })

    return () => {
      clearInterval(interval)
      appStateListener.remove()
    }
  }, [refreshConnectivity])

  const value = useMemo(
    () => ({
      isOnline,
      queueSize,
      isSyncing,
      refreshConnectivity
    }),
    [isOnline, queueSize, isSyncing, refreshConnectivity]
  )

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
      <ConnectivityBanner isOnline={isOnline} queueSize={queueSize} isSyncing={isSyncing} />
    </ConnectivityContext.Provider>
  )
}

function ConnectivityBanner(params: { isOnline: boolean; queueSize: number; isSyncing: boolean }) {
  if (params.isOnline && params.queueSize === 0 && !params.isSyncing) return null

  const backgroundColor = params.isOnline ? "#064e3b" : "#7f1d1d"
  const text = !params.isOnline
    ? params.queueSize > 0
      ? `Offline mode: ${params.queueSize} action(s) queued`
      : "Offline mode: showing cached data when available"
    : params.isSyncing
      ? "Connection restored: syncing queued actions..."
      : `Connection restored: ${params.queueSize} queued action(s) remaining`

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 48,
        paddingHorizontal: 14,
        paddingBottom: 10,
        backgroundColor
      }}
    >
      <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 12 }}>{text}</Text>
    </View>
  )
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext)
  if (!context) throw new Error("useConnectivity must be used inside ConnectivityProvider")
  return context
}
