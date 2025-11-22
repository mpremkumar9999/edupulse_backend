import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadsDir = 'uploads'
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now()+ '-' + Math.random().toString(36).slice(2,8) + ext)
  }
})

const upload = multer({ storage })
export default upload
