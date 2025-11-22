import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'
import {
  submitAssignment,
  getSubmissionsByAssignment,
  gradeSubmission,
  getStudentSubmissions,
} from '../controllers/submissionController.js'

const router = express.Router()

// 🧑‍🎓 Student: submit assignment
router.post('/', protect, upload.single('file'), submitAssignment)

// 🧑‍🎓 Student: view their own submissions (must come BEFORE /:assignmentId)
router.get('/student', protect, getStudentSubmissions)

// 👨‍🏫 Faculty: view submissions for a specific assignment
router.get('/:assignmentId', protect, getSubmissionsByAssignment)

// 👨‍🏫 Faculty: grade submission
router.patch('/:id/grade', protect, gradeSubmission)

export default router
