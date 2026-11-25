// Device-local avatar storage. Only the logical model ID is saved by Hanami's server.
const PREFIX = '/vrm/local-'
const LIMIT = 50 * 1024 * 1024
type Avatar = { url: string; blob: Blob }
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hanami-local-avatars-v1', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('avatars', { keyPath: 'url' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
export function isLocalAvatar(url: string): boolean { return url.startsWith(PREFIX) }
export async function listLocalAvatars(): Promise<string[]> {
  const db = await openDb()
  try {
    return await new Promise<string[]>((resolve, reject) => {
      const req = db.transaction('avatars').objectStore('avatars').getAllKeys()
      req.onsuccess = () => resolve(req.result.map(String))
      req.onerror = () => reject(req.error)
    })
  } finally { db.close() }
}
export async function saveLocalAvatar(file: File): Promise<string> {
  if (!/\.vrm$/i.test(file.name) || file.size < 20 || file.size > LIMIT) {
    throw new Error('Choose a .vrm file between 20 bytes and 50 MB.')
  }
  const header = new DataView(await file.slice(0, 20).arrayBuffer())
  const len = header.getUint32(12, true)
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 ||
      header.getUint32(8, true) !== file.size || header.getUint32(16, true) !== 0x4e4f534a ||
      len > file.size - 20 || len > 8 * 1024 * 1024) {
    throw new Error('Invalid VRM container.')
  }
  const json = JSON.parse(await file.slice(20, 20 + len).text())
  const human = json.extensions?.VRMC_vrm?.humanoid ?? json.extensions?.VRM?.humanoid
  if (!human?.humanBones) throw new Error('This file has no VRM humanoid rig. Convert the model to VRM first.')
  for (const entry of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (typeof entry.uri === 'string' && !entry.uri.startsWith('data:')) {
      throw new Error('Choose a self-contained VRM without external files.')
    }
  }
  const stem = file.name.slice(0, -4).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 64) || 'avatar'
  const url = PREFIX + stem + '-' + crypto.randomUUID().slice(0, 8) + '.vrm'
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('avatars', 'readwrite')
      tx.objectStore('avatars').put({ url, blob: file.slice(0, file.size, 'model/gltf-binary') } satisfies Avatar)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('Avatar save aborted.'))
    })
    return url
  } finally { db.close() }
}
export async function localAvatarBlob(url: string): Promise<Blob> {
  const db = await openDb()
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const req = db.transaction('avatars').objectStore('avatars').get(url)
      req.onsuccess = () => {
        const avatar = req.result as Avatar | undefined
        if (avatar?.blob) resolve(avatar.blob)
        else reject(new Error('This avatar is stored on another device or was removed. Import the VRM again.'))
      }
      req.onerror = () => reject(req.error)
    })
  } finally { db.close() }
}
