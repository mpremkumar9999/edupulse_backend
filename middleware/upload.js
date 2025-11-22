import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadsDir = 'uploads'
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext
    cb(null, name)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/
    const okExt = allowed.test(path.extname(file.originalname).toLowerCase())
    const okMime = allowed.test(file.mimetype)
    if (okExt && okMime) cb(null, true)
    else cb(new Error('Only .png, .jpg and .jpeg allowed'))
  }
})

export default upload
