export const asyncify = (fn) => (req, res) => fn(req, res).catch(err => {
  console.error(err)
  res.status(500).send(err.message)
})
