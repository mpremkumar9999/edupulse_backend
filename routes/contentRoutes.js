import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'
import {
  createContent,
  getContentByClass,
  getContentByFaculty,
  getContentForStudent,
  deleteContent,
  updateContent
} from '../controllers/contentController.js'

const router = express.Router()

// All routes are protected
router.post('/', protect, upload.single('file'), createContent)
router.get('/class/:className', protect, getContentByClass)
router.get('/faculty', protect, getContentByFaculty)
router.get('/student', protect, getContentForStudent)
router.delete('/:id', protect, deleteContent)
router.put('/:id', protect, upload.single('file'), updateContent)

export default router