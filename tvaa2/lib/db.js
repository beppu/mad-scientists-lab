const fs = require('fs')
const xdgBasedir = require('xdg-basedir')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const mkdirp = require('mkdirp')
const pathDirname = require('path-dirname')

let DB_INSTANCE = undefined

async function init(dbPath) {
  await mkdirp(pathDirname(dbPath))
  const adapter = new FileSync(dbPath)
  const db = low(adapter)
  await db.defaults({ config: { volume: 100 }}).write()
  return db
}

async function instance() {
  if (DB_INSTANCE) return DB_INSTANCE

  console.log('wtf')
  const dbPath = xdgBasedir.data + '/tvaa2/db.json'
  console.log('dbPath', dbPath)

  try {
    const stat = fs.statSync(dbPath)
    const adapter = new FileSync(dbPath)
    const db = DB_INSTANCE = low(adapter)
    console.log('hi 3')
    return db
  }
  catch (e) {
    console.warn(e)
    if (e.code === 'ENOENT') {
      const db = DB_INSTANCE = await init(dbPath) 
      return db
    } else {
      console.warn('cannot init database', e)
      process.exit(-1)
    }
  }
}

module.exports = {
  init,
  instance
}
