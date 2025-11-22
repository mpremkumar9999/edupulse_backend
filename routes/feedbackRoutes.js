import express from 'express'
import {
  submitFeedback,
  getFacultyFeedback,
  getStudentFeedback
} from '../controllers/feedbackController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/submit', protect, submitFeedback)
router.get('/faculty/:facultyId', getFacultyFeedback)
router.get('/student', protect, getStudentFeedback)

export default router