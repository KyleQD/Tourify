import AsyncStorage from "@react-native-async-storage/async-storage"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import { exportOfflineQueueItems, mergeOfflineQueueItems } from "@/lib/api/client"

interface PeerSyncPacketV1 {
  version: "v1"
  sourceDeviceId: string
  generatedAt: string
  queuedRequests: {
    id: string
    path: string
    method: string
    body?: string
    authRequired: boolean
    createdAt: string
  }[]
}

interface MeshPacket {
  packetId: string
  sourceDeviceId: string
  createdAt: string
  ttl: number
  hopCount: number
  relayPath: string[]
  queuedRequests: {
    id: string
    path: string
    method: string
    body?: string
    authRequired: boolean
    createdAt: string
  }[]
}

interface MeshBundle {
  version: "v2"
  bundleId: string
  sourceDeviceId: string
  createdAt: string
  packets: MeshPacket[]
}

interface MeshPacketLogEntry {
  packet: MeshPacket
  receivedAt: string
}

const DEVICE_ID_KEY = "tourify-mobile:device-id:v1"
const PEER_PACKET_PREFIX = "tourify-peer-sync"
const MESH_PACKET_LOG_KEY = "tourify-mobile:mesh-packet-log:v1"
const MESH_SEEN_PACKET_IDS_KEY = "tourify-mobile:mesh-seen-packets:v1"
const MAX_RELAY_PACKETS = 30
const DEFAULT_PACKET_TTL = 4

async function getOrCreateDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing

  const nextId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
  await AsyncStorage.setItem(DEVICE_ID_KEY, nextId)
  return nextId
}

async function readPacketLog() {
  const raw = await AsyncStorage.getItem(MESH_PACKET_LOG_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as MeshPacketLogEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writePacketLog(entries: MeshPacketLogEntry[]) {
  await AsyncStorage.setItem(MESH_PACKET_LOG_KEY, JSON.stringify(entries))
}

async function readSeenPacketIds() {
  const raw = await AsyncStorage.getItem(MESH_SEEN_PACKET_IDS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeSeenPacketIds(ids: string[]) {
  await AsyncStorage.setItem(MESH_SEEN_PACKET_IDS_KEY, JSON.stringify(ids))
}

function buildPacketFilename(prefix: string) {
  const sanitizedPrefix = prefix.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()
  return `${sanitizedPrefix}-${Date.now()}.json`
}

function createPacketId(sourceDeviceId: string) {
  return `${sourceDeviceId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

function isPacketRelayable(packet: MeshPacket) {
  return packet.hopCount < packet.ttl
}

function normalizePacket(packet: MeshPacket, receivingDeviceId: string): MeshPacket | null {
  if (!packet.packetId || !packet.sourceDeviceId) return null
  if (!Array.isArray(packet.queuedRequests)) return null
  if (packet.ttl <= 0) return null

  const nextRelayPath = packet.relayPath.includes(receivingDeviceId)
    ? packet.relayPath
    : [...packet.relayPath, receivingDeviceId]
  const nextHopCount = packet.hopCount + 1
  if (nextHopCount > packet.ttl) return null

  return {
    ...packet,
    hopCount: nextHopCount,
    relayPath: nextRelayPath
  }
}

function toV2BundleFromV1(packet: PeerSyncPacketV1): MeshBundle {
  return {
    version: "v2",
    bundleId: `upgrade-${Date.now()}`,
    sourceDeviceId: packet.sourceDeviceId,
    createdAt: packet.generatedAt,
    packets: [
      {
        packetId: createPacketId(packet.sourceDeviceId),
        sourceDeviceId: packet.sourceDeviceId,
        createdAt: packet.generatedAt,
        ttl: DEFAULT_PACKET_TTL,
        hopCount: 0,
        relayPath: [packet.sourceDeviceId],
        queuedRequests: packet.queuedRequests
      }
    ]
  }
}

function parsePacket(raw: string): MeshBundle {
  const parsed = JSON.parse(raw) as MeshBundle | PeerSyncPacketV1
  if ((parsed as MeshBundle)?.version === "v2") {
    const bundle = parsed as MeshBundle
    if (!Array.isArray(bundle.packets)) throw new Error("Invalid mesh packet format")
    return bundle
  }

  if ((parsed as PeerSyncPacketV1)?.version === "v1")
    return toV2BundleFromV1(parsed as PeerSyncPacketV1)

  throw new Error("Unsupported packet version")
}

async function buildMeshBundle() {
  const sourceDeviceId = await getOrCreateDeviceId()
  const queuedRequests = await exportOfflineQueueItems()
  const packetLog = await readPacketLog()
  const activeRelayPackets = packetLog
    .map((entry) => entry.packet)
    .filter(isPacketRelayable)
    .slice(0, MAX_RELAY_PACKETS)

  const localPacket: MeshPacket | null = queuedRequests.length
    ? {
      packetId: createPacketId(sourceDeviceId),
      sourceDeviceId,
      createdAt: new Date().toISOString(),
      ttl: DEFAULT_PACKET_TTL,
      hopCount: 0,
      relayPath: [sourceDeviceId],
      queuedRequests
    }
    : null

  const packets = localPacket ? [localPacket, ...activeRelayPackets] : activeRelayPackets
  return {
    version: "v2" as const,
    bundleId: createPacketId(sourceDeviceId),
    sourceDeviceId,
    createdAt: new Date().toISOString(),
    packets
  }
}

async function persistRelayPackets(packets: MeshPacket[]) {
  if (!packets.length) return

  const packetLog = await readPacketLog()
  const knownPacketIds = new Set(packetLog.map((entry) => entry.packet.packetId))
  const nextEntries = [...packetLog]

  for (const packet of packets) {
    if (knownPacketIds.has(packet.packetId)) continue
    nextEntries.unshift({
      packet,
      receivedAt: new Date().toISOString()
    })
  }

  await writePacketLog(nextEntries.slice(0, 100))
}

async function markSeenPacketIds(packetIds: string[]) {
  if (!packetIds.length) return

  const existing = await readSeenPacketIds()
  const merged = Array.from(new Set([...packetIds, ...existing]))
  await writeSeenPacketIds(merged.slice(0, 500))
}

export async function getMeshSyncStats() {
  const [queueRequests, packetLog, seenPacketIds] = await Promise.all([
    exportOfflineQueueItems(),
    readPacketLog(),
    readSeenPacketIds()
  ])

  const relayablePackets = packetLog.filter((entry) => isPacketRelayable(entry.packet))
  return {
    queuedActions: queueRequests.length,
    storedPackets: packetLog.length,
    relayablePackets: relayablePackets.length,
    seenPackets: seenPacketIds.length
  }
}

export async function sharePeerSyncPacket() {
  const bundle = await buildMeshBundle()
  if (!bundle.packets.length)
    return { shared: false, reason: "No queued or relay packets available to share." }

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare)
    return { shared: false, reason: "Share sheet is unavailable on this device." }

  const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory
  if (!baseDirectory)
    return { shared: false, reason: "No writable storage directory is available." }

  const fileUri = `${baseDirectory}${buildPacketFilename(PEER_PACKET_PREFIX)}`
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(bundle, null, 2))

  await Sharing.shareAsync(fileUri, {
    mimeType: "application/json",
    dialogTitle: "Share mesh sync packet"
  })

  return {
    shared: true,
    packetCount: bundle.packets.length,
    actionCount: bundle.packets.reduce((sum, packet) => sum + packet.queuedRequests.length, 0)
  }
}

export async function importPeerSyncPacketFromPicker() {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true
  })

  if (result.canceled || !result.assets?.length)
    return { imported: false, reason: "Import canceled." }

  const selectedFile = result.assets[0]
  const raw = await FileSystem.readAsStringAsync(selectedFile.uri)
  const bundle = parsePacket(raw)
  const receivingDeviceId = await getOrCreateDeviceId()
  const seenPacketIds = new Set(await readSeenPacketIds())

  const unseenPackets = bundle.packets.filter((packet) => !seenPacketIds.has(packet.packetId))
  const normalizedPackets = unseenPackets
    .map((packet) => normalizePacket(packet, receivingDeviceId))
    .filter((packet): packet is MeshPacket => Boolean(packet))

  const queuedRequests = normalizedPackets.flatMap((packet) => packet.queuedRequests)
  const mergeResult = await mergeOfflineQueueItems(queuedRequests)
  const relayPackets = normalizedPackets.filter(isPacketRelayable)

  await persistRelayPackets(relayPackets)
  await markSeenPacketIds(normalizedPackets.map((packet) => packet.packetId))

  return {
    imported: true,
    sourceDeviceId: bundle.sourceDeviceId,
    receivedPackets: bundle.packets.length,
    acceptedPackets: normalizedPackets.length,
    relayedPacketsReady: relayPackets.length,
    receivedActions: queuedRequests.length,
    addedActions: mergeResult.added,
    totalQueued: mergeResult.total
  }
}

export async function clearMeshRelayPackets() {
  await writePacketLog([])
  return { cleared: true }
}
