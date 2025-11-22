import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'
import {
  createAssignment,
  getAssignmentsByClass,
  getAssignmentsByTeacher,
  getAssignmentsForStudent,
} from '../controllers/assignmentController.js'

const router = express.Router()

// All routes are protected
router.post('/', protect, upload.single('file'), createAssignment)
router.get('/class/:className', protect, getAssignmentsByClass)
router.get('/teacher', protect, getAssignmentsByTeacher)
router.get('/student', protect, getAssignmentsForStudent)

export default router