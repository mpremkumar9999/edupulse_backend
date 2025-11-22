import express from 'express'
import {
  getFacultyClasses,
  getClassStudents,
  markAttendance,
  getStudentAttendance,
  getClassAttendanceReport
} from '../controllers/attendanceController.js'

const router = express.Router()

// Get faculty's classes for today
router.get('/faculty-classes/:facultyId', getFacultyClasses)

// Get students for a class
router.get('/class-students/:className', getClassStudents)

// Mark attendance
router.post('/mark-attendance', markAttendance)

// Get student attendance
router.get('/student/:studentId', getStudentAttendance)

// Get class attendance report - FIXED: Remove optional parameter syntax
router.get('/report/:className', getClassAttendanceReport)
router.get('/report/:className/:subject', getClassAttendanceReport)

export default router