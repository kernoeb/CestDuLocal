import path from 'path'
import cors from 'cors'
import compression from 'compression'
import { fileURLToPath } from 'url'
import { getInfos } from './utils/dir.mjs'
import { asyncify } from './utils/asyncify.mjs'
import HyperExpress from 'hyper-express'
import SessionEngine from 'hyper-express-session'
import { Low, JSONFile } from 'lowdb'
import chokidar from 'chokidar'
import { access, readFile, stat } from 'fs/promises'
import { constants } from 'fs'
import mimeTypes from 'mime-types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const file = path.join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)

await db.read()
db.data ||= { ok: false }
db.data.ok = true
await db.write()

const duration = 1000 * 60 * 60 * 24 * 365 * 10 // 10 years
const JSONEngine = new SessionEngine({
  duration,
  cookie: {
    name: 'session', secret: 'super-secret', secure: true, httpOnly: true, path: '/', sameSite: 'None' // TODO security
  }
})

JSONEngine.use('read', async (session) => {
  await db.read()
  if (db.data?.sessions?.[session.id]) return db.data.sessions[session.id]
  else return {}
})

JSONEngine.use('touch', async (session) => {
  // TODO
})

JSONEngine.use('write', async (session, data) => {
  await db.read()
  db.data ||= { sessions: {} }
  db.data.sessions[session.id] = data
  await db.write()
})

JSONEngine.use('destroy', async (session) => {
  await db.read()
  delete db.data.sessions[session.id]
  await db.write()
})

const webserver = new HyperExpress.Server()

webserver.use(cors())
webserver.use(compression())
webserver.use(JSONEngine)

const currentPath = process.cwd()
const s = path.join(__dirname, '/../public/dist/')
console.log(s)

const checkFileExists = async (file) => {
  try {
    await access(file, constants.F_OK)
    return true
  } catch (e) {
    return false
  }
}

const serve = async ({ dir, request, response }) => {
  const pattern = request.route.pattern.replace(/\*$/g, '')
  let filename = path.join(dir, request.url.replace(pattern, ''))
  filename = filename.split('/').map(decodeURIComponent).join('/')
  if (await checkFileExists(filename)) {
    if (filename.startsWith(dir)) {
      if ((await stat(filename)).isDirectory()) filename += '/index.html'
      const file = await readFile(filename)
      const mime = mimeTypes.lookup(filename) || 'text/plain'
      response.set('Content-Type', mime)
      response.set('Cache-Control', 'no-cache')
      return response.status(200).send(file)
    } else {
      return response.status(403).send('Forbidden') // just in case
    }
  } else {
    return response.status(404).send('Not found')
  }
}

webserver.get('/*', asyncify(async (request, response) => serve({ dir: s, request, response })))

webserver.get('/served/*', asyncify(async (request, response) => serve({ dir: currentPath, request, response })))

const router = new HyperExpress.Router()
router.get('/explorer', asyncify(async (request, response) => {
  let p = request.query.p
  if (!p || p === '/') p = ''
  const tmp = await getInfos(p, response)
  return response.json(tmp)
}))

router.upgrade('/ws/connect', async (request, response) => {
  const id = request.session.id
  response.upgrade({ id })
})

const sendJSON = (value) => JSON.stringify({ type: 'update', value })

chokidar.watch(currentPath, { ignoreInitial: true })
  .on('add', () => {
    webserver.publish('update', JSON.stringify({ type: 'update-files' }))
  })
  .on('unlink', () => {
    webserver.publish('update', JSON.stringify({ type: 'update-files' }))
  })

router.ws('/ws/connect', (ws) => {
  ws.on('message', async (message) => {
    const parsed = JSON.parse(message)

    if (parsed.type === 'connect' && !ws.is_subscribed('update')) {
      ws.subscribe('update')
      await db.read()
      const text = db.data.text || ''
      return ws.send(sendJSON(text))
    }

    if (parsed.type !== 'update') return

    await db.read()
    db.data ||= { text: '' }
    db.data.text = parsed.value || ''

    ws.publish('update', sendJSON(db.data.text))
    await db.write()
  })
})

webserver.use('/api', router)

// LISTEN
webserver.listen(3000).then(() => {
  console.log('Server started at http://localhost:3000')
}).catch(err => {
  console.log(err)
})
