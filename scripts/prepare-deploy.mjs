import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

async function manifest(directory, prefix = '') {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`
    if (entry.isDirectory()) files.push(...await manifest(path.join(directory, entry.name), `${relative}/`))
    else {
      const content = await readFile(path.join(directory, entry.name))
      files.push({ path: relative, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') })
    }
  }
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
}

const files = await manifest('dist')
if (!files.some(file => /^assets\/browser-.*\.js$/.test(file.path))) throw new Error('Gere um build com VITE_ENABLE_MSW=true antes de preparar a demonstração.')
const buildId = createHash('sha256').update(JSON.stringify(files)).digest('hex')
const stage = `artifacts/deploy/preview-${buildId.slice(0, 12)}`
await mkdir(stage, { recursive: true })
await cp('dist', stage, { recursive: true })
await writeFile(`${stage}/vercel.json`, JSON.stringify({ version: 2, routes: [{ handle: 'filesystem' }, { src: '/.*', dest: '/index.html' }] }, null, 2))
await writeFile('artifacts/deploy/build.json', JSON.stringify({ buildId, htmlSha256: createHash('sha256').update(await readFile('dist/index.html')).digest('hex'), stage, files }, null, 2))
console.log(`Build: ${buildId}\nPacote: ${stage}\nDeploy: npx vercel deploy ${stage} --yes`)
