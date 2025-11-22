import express from 'express'
import {
  getFacultyTimetable,
  updateTimetable,
  deleteTimetableEntry,
  getClassTimetable,
  bulkUpdateTimetable
} from '../controllers/timetableController.js'

const router = express.Router()

// Get timetable for specific faculty
router.get('/faculty/:facultyId', getFacultyTimetable)

// Get timetable for specific class
router.get('/class/:className', getClassTimetable)

// Create/update timetable entry
router.post('/update', updateTimetable)

// Bulk update timetable
router.post('/bulk-update', bulkUpdateTimetable)

// Delete timetable entry
router.delete('/entry/:id', deleteTimetableEntry)

export default router