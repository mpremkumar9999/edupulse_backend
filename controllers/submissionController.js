import Submission from '../models/Submission.js'
import Assignment from '../models/Assignment.js'
import User from '../models/User.js'

// ✅ Student: Submit assignment
export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.body
    const studentId = req.user.id

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const fileUrl = `/uploads/${req.file.filename}`

    const submission = await Submission.create({
      assignment: assignmentId,
      student: studentId,
      fileUrl,
    })

    res.status(201).json({ message: 'Assignment submitted', submission })
  } catch (error) {
    console.error('Error in submitAssignment:', error)
    res.status(500).json({ message: error.message })
  }
}

// ✅ Faculty: Get all submissions for a specific assignment
export const getSubmissionsByAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params
    const facultyId = req.user.id

    const assignment = await Assignment.findById(assignmentId)
      .populate('faculty', 'name')
      .lean()

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' })
    }

    if (assignment.faculty._id.toString() !== facultyId) {
      return res
        .status(403)
        .json({ message: 'Not authorized to view this assignment' })
    }

    const submissions = await Submission.find({ assignment: assignmentId })
      .populate('student', 'name className')
      .sort({ submittedAt: -1 })
      .lean()

    const studentsInClass = await User.find({
      role: 'Student',
      className: assignment.className,
    })
      .select('name className')
      .lean()

    const submissionDetails = studentsInClass.map((student) => {
      const sub = submissions.find(
        (s) => s.student._id.toString() === student._id.toString()
      )
      return {
        _id: sub?._id || null,
        studentName: student.name,
        submitted: !!sub,
        fileUrl: sub?.fileUrl || null,
        submittedAt: sub?.submittedAt || null,
        marks: sub?.marks || null,
        feedback: sub?.feedback || null,
      }
    })

    res.json({
      assignmentTitle: assignment.title,
      className: assignment.className,
      totalStudents: studentsInClass.length,
      totalSubmitted: submissions.length,
      submissionDetails,
    })
  } catch (error) {
    console.error('Error in getSubmissionsByAssignment:', error)
    res.status(500).json({ message: error.message })
  }
}

// ✅ Faculty: Grade a student's submission
export const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params
    const { marks, feedback } = req.body

    if (marks == null || marks < 0) {
      return res
        .status(400)
        .json({ message: 'Marks must be a non-negative number' })
    }

    const submission = await Submission.findById(id)
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' })
    }

    const assignment = await Assignment.findById(submission.assignment)
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' })
    }

    if (assignment.faculty.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: 'Not authorized to grade this submission' })
    }

    submission.marks = marks
    submission.feedback = feedback || ''
    await submission.save()

    res.json({ message: 'Submission graded successfully', submission })
  } catch (error) {
    console.error('❌ Error grading submission:', error)
    res.status(500).json({ message: error.message })
  }
}

// ✅ Student: View their own submissions with assignment title + status
export const getStudentSubmissions = async (req, res) => {
  try {
    const studentId = req.user.id

    const submissions = await Submission.find({ student: studentId })
      .populate('assignment', 'title')
      .sort({ submittedAt: -1 })

    res.json(
      submissions.map((s) => ({
        _id: s._id,
        assignmentTitle: s.assignment ? s.assignment.title : 'Untitled',
        submittedAt: s.submittedAt,
        marks: s.marks ?? '-',
        feedback: s.feedback ?? '-',
        status: s.marks != null ? 'Graded' : 'Pending',
      }))
    )
  } catch (error) {
    console.error('Error in getStudentSubmissions:', error)
    res.status(500).json({ message: error.message })
  }
}
