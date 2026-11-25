// Add an optional second redistributable sample for this demo.
// VRM1_Constraint_Twist_Sample (c) 2022 pixiv Inc.
// https://github.com/vrm-c/vrm-specification/tree/master/samples/VRM1_Constraint_Twist_Sample
// VRM Public License 1.0 https://vrm.dev/licenses/1.0/
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const source = 'https://raw.githubusercontent.com/vrm-c/vrm-specification/master/samples/VRM1_Constraint_Twist_Sample/vrm/VRM1_Constraint_Twist_Sample.vrm'
const expected = '8ee8717df1af676c4ab89c2344d5bcd907d039f9'
function gitBlobHash(buf) {
  return createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex')
}
try {
  const modelPath = 'vrm/Pixiv-Twist-Sample.vrm'
  let buffer = await readFile(modelPath).catch(() => null)
  if (!buffer || gitBlobHash(buffer) !== expected) {
    const response = await fetch(source, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    buffer = Buffer.from(await response.arrayBuffer())
    if (gitBlobHash(buffer) !== expected) throw new Error('Sample checksum mismatch')
    await mkdir('vrm', { recursive: true })
    await writeFile(modelPath, buffer)
  }
  const dir = 'presets/pixiv-sample'
  await mkdir(dir + '/memory', { recursive: true })
  await writeFile(dir + '/character.json', JSON.stringify({
    id: 'pixiv-sample', name: 'Pixiv Sample', vrm: '/vrm/Pixiv-Twist-Sample.vrm',
    background: '', environment: '/environments/cozy-loft-room.glb',
    greeting: 'Ciao! Sono il secondo avatar di prova. Puoi cambiare personaggio dal menu.',
    createdAt: '2026-11-25T00:00:00.000Z'
  }, null, 2))
  await writeFile(dir + '/system-prompt.md', 'Sei un personaggio dimostrativo di Hanami. Rispondi in italiano.')
  await writeFile(dir + '/memory/MEMORY.md', '# Memory\n')
  await writeFile('vrm/Pixiv-Twist-Sample.LICENCE.txt', '(c) 2022 pixiv Inc.\nVRM Public License 1.0: https://vrm.dev/licenses/1.0/\nSource: ' + source + '\n')
  console.log('Second VRM sample verified and ready')
} catch (error) {
  // Network restrictions must not prevent the primary demo from building.
  console.warn('Optional second VRM unavailable:', error.message)
}
