export type InstagramAccount = {
  username: string
  href: string
  timestamp?: number
}

export type FileKind = "followers" | "following" | "unknown"

type StringListItem = {
  href?: string
  value?: string
  timestamp?: number
}

type ExportEntry = {
  title?: string
  string_list_data?: StringListItem[]
}

function profileUrl(username: string): string {
  return `https://www.instagram.com/${username}/`
}

function getEntries(data: unknown): ExportEntry[] {
  if (Array.isArray(data)) return data as ExportEntry[]
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.relationships_following)) {
      return obj.relationships_following as ExportEntry[]
    }
    if (Array.isArray(obj.relationships_followers)) {
      return obj.relationships_followers as ExportEntry[]
    }
  }
  return []
}

function extractAccount(entry: ExportEntry): InstagramAccount | null {
  const item = entry.string_list_data?.[0]
  const username = String(entry.title || item?.value || "")
    .trim()
    .replace(/^@/, "")

  if (!username) return null

  return {
    username,
    href: profileUrl(username),
    timestamp: typeof item?.timestamp === "number" ? item.timestamp : undefined,
  }
}

export function detectFileKind(data: unknown, fileName = ""): FileKind {
  const name = fileName.toLowerCase()
  if (name.includes("following")) return "following"
  if (name.includes("follower")) return "followers"

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.relationships_following)) return "following"
    if (Array.isArray(obj.relationships_followers)) return "followers"
  }

  if (Array.isArray(data)) return "followers"
  return "unknown"
}

export function parseInstagramFile(data: unknown): InstagramAccount[] {
  const seen = new Set<string>()
  const accounts: InstagramAccount[] = []

  for (const entry of getEntries(data)) {
    const account = extractAccount(entry)
    if (!account) continue

    const key = account.username.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    accounts.push(account)
  }

  return accounts
}

export function findNotFollowingBack(
  following: InstagramAccount[],
  followers: InstagramAccount[],
): InstagramAccount[] {
  const followerSet = new Set(
    followers.map((account) => account.username.toLowerCase()),
  )

  return following
    .filter((account) => !followerSet.has(account.username.toLowerCase()))
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
}

export function formatFollowedAt(timestamp?: number): string {
  if (!timestamp) return "Fecha desconocida"
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp * 1000))
}
