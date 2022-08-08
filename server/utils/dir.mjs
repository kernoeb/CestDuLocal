import path from 'path'
import { promises as fs } from 'fs'
import { pathToFileURL } from 'url'

const currentPath = process.cwd()

// TODO fix symlinks
export const getInfos = async (p, response) => {
  const joined = path.join(currentPath, p)
  const stats = await fs.stat(joined)
  if (!stats.isDirectory()) return response.status(500).send('Not a directory')
  if (!joined.startsWith(currentPath)) return response.status(500).send('Not in current directory')

  const elements = (await fs.readdir(joined)).map(v => path.join(joined, v)) // get all files in directory

  const promises = await Promise.all(elements.map(el => fs.lstat(el))) // get all stats
  return {
    currentPath,
    parent: p ? (path.join(currentPath, path.dirname(p))).split(currentPath)[1] || path.sep : '',
    files: elements.map((n, i) => { // build a json
      return ({
        name: path.basename(n),
        fullpath: n,
        relative: n.split(currentPath)[1],
        fileUrl: pathToFileURL(n),
        size: promises[i].size,
        directory: promises[i].isDirectory()
      })
    }).sort((a, b) => b.directory - a.directory)
  }
}
