import Attendance from '../models/Attendance.js'
import User from '../models/User.js'
import Timetable from '../models/Timetable.js'

// Get today's classes for faculty
export const getFacultyClasses = async (req, res) => {
  try {
    const { facultyId } = req.params
    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    
    // Get faculty's classes for today from timetable
    const todayClasses = await Timetable.find({ 
      facultyId,
      day: dayName 
    }).sort({ startTime: 1 })

    res.json({
      success: true,
      classes: todayClasses
    })
  } catch (err) {
    console.error('❌ Get faculty classes error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching classes' 
    })
  }
}

// Get students for a specific class
export const getClassStudents = async (req, res) => {
  try {
    const { className } = req.params
    
    const students = await User.find({ 
      className: className,
      role: 'Student',
      isVerified: true 
    }).select('_id name username email className')

    res.json({
      success: true,
      students
    })
  } catch (err) {
    console.error('❌ Get class students error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching students' 
    })
  }
}

// Mark attendance
export const markAttendance = async (req, res) => {
  try {
    const { facultyId, className, subject, session, attendanceData } = req.body
    const today = new Date()
    
    const faculty = await User.findById(facultyId)
    if (!faculty) {
      return res.status(404).json({ 
        success: false,
        message: 'Faculty not found' 
      })
    }

    const results = []
    const errors = []

    for (const record of attendanceData) {
      try {
        // Check if attendance already exists for today
        const existingAttendance = await Attendance.findOne({
          studentId: record.studentId,
          subject: subject,
          date: {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lt: new Date(today.setHours(23, 59, 59, 999))
          },
          session: session
        })

        let attendanceRecord

        if (existingAttendance) {
          // Update existing attendance
          attendanceRecord = await Attendance.findByIdAndUpdate(
            existingAttendance._id,
            {
              status: record.status,
              facultyId: facultyId,
              facultyName: faculty.name
            },
            { new: true }
          )
        } else {
          // Create new attendance record
          attendanceRecord = new Attendance({
            studentId: record.studentId,
            studentName: record.studentName,
            className: className,
            subject: subject,
            facultyId: facultyId,
            facultyName: faculty.name,
            date: today,
            status: record.status,
            session: session
          })
          await attendanceRecord.save()
        }

        results.push(attendanceRecord)
      } catch (error) {
        errors.push({
          studentId: record.studentId,
          error: error.message
        })
      }
    }

    res.json({
      success: true,
      message: `Attendance marked for ${results.length} students`,
      results,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (err) {
    console.error('❌ Mark attendance error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error marking attendance' 
    })
  }
}

// Get attendance for a student
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params
    const { subject, month, year } = req.query

    const student = await User.findById(studentId)
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      })
    }

    // Build query
    const query = { studentId }
    if (subject) query.subject = subject
    
    // Filter by month and year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      query.date = { $gte: startDate, $lte: endDate }
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('facultyId', 'name')

    // Calculate statistics
    const totalClasses = attendance.length
    const presentClasses = attendance.filter(a => a.status === 'Present').length
    const absentClasses = attendance.filter(a => a.status === 'Absent').length
    const lateClasses = attendance.filter(a => a.status === 'Late').length
    
    const attendancePercentage = totalClasses > 0 
      ? Math.round((presentClasses / totalClasses) * 100) 
      : 0

    // Get unique subjects for filter
    const subjects = await Attendance.distinct('subject', { studentId })

    res.json({
      success: true,
      attendance,
      statistics: {
        totalClasses,
        presentClasses,
        absentClasses,
        lateClasses,
        attendancePercentage
      },
      subjects
    })
  } catch (err) {
    console.error('❌ Get student attendance error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching attendance' 
    })
  }
}

// Get attendance report for faculty - FIXED: Handle optional subject parameter
export const getClassAttendanceReport = async (req, res) => {
  try {
    const { className, subject } = req.params
    const { date } = req.query

    const query = { className }
    // Only add subject to query if it's provided and not empty
    if (subject && subject !== 'undefined') {
      query.subject = subject
    }
    
    if (date) {
      const targetDate = new Date(date)
      query.date = {
        $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        $lt: new Date(targetDate.setHours(23, 59, 59, 999))
      }
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'name username')
      .sort({ date: -1, studentName: 1 })

    // Calculate attendance percentage for each student
    const students = await User.find({ className, role: 'Student' })
    const report = await Promise.all(
      students.map(async (student) => {
        const studentQuery = { 
          studentId: student._id 
        }
        // Only add subject to student query if it's provided and not empty
        if (subject && subject !== 'undefined') {
          studentQuery.subject = subject
        }
        
        const studentAttendance = await Attendance.find(studentQuery)
        
        const totalClasses = studentAttendance.length
        const presentClasses = studentAttendance.filter(a => a.status === 'Present').length
        const percentage = totalClasses > 0 
          ? Math.round((presentClasses / totalClasses) * 100) 
          : 0

        return {
          studentId: student._id,
          studentName: student.name,
          username: student.username,
          totalClasses,
          presentClasses,
          absentClasses: totalClasses - presentClasses,
          attendancePercentage: percentage
        }
      })
    )

    res.json({
      success: true,
      report: report.sort((a, b) => b.attendancePercentage - a.attendancePercentage),
      attendanceRecords: attendance
    })
  } catch (err) {
    console.error('❌ Get class attendance report error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error generating attendance report' 
    })
  }
}