pipy({
  _serveFile: (req, type, filename) => (
    filename = req.head.path.substring(22),
    os.stat(filename) ? (
      new Message(
        {
          bodiless: req.head.method === 'HEAD',
          headers: {
            'etag': os.stat(filename)?.mtime | 0,
            'content-type': type,
          },
        },
        req.head.method === 'HEAD' ? null : os.readFile(filename),
      )
    ) : (
      new Message({ status: 404 }, `file ${filename} not found`)
    )
  ),
  _router: new algo.URLRouter({
    '/repo/registry-mirror/': () => new Message('/main.js\n/config.json'),
    '/repo/registry-mirror/*': req => _serveFile(req, 'text/plain')
  }),
})
  .listen(6080)
  .serveHTTP(
    req => _router.find(req.head.path)(req)
  )