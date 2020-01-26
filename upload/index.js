const {send} = require('micro')
const {upload, move} = require('micro-upload')

const uploadForm = `
<body>
  <h1>Upload Files Here</h1>
  <form method="POST" action="/" enctype="multipart/form-data">
    <input name="file" type="file" />
    <input name="submit" type="submit" />
  </form>
</body>
`

module.exports = upload(async (req, res) => {
  if (req.method === 'GET') {
    return send(res, 200, uploadForm)
  } else {
    if (!req.files) {
      return send(res, 400, 'no file uploaded')
    }
    let file = req.files.file
    await move(file, `./${file.name}`)
    send(res, 200, 'upload success')
  }
})
