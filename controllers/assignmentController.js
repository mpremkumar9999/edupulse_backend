import Assignment from '../models/Assignment.js'
import Submission from '../models/Submission.js'
import User from '../models/User.js'
import nodemailer from 'nodemailer'

// Configure Nodemailer (use the same transporter from authController)
const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error('❌ Gmail credentials missing for email notifications')
    return null
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER.trim(),
        pass: process.env.GMAIL_PASS.trim(),
      },
      tls: {
        rejectUnauthorized: false
      }
    })
    return transporter
  } catch (error) {
    console.error('❌ Error creating email transporter:', error)
    return null
  }
}

const transporter = createTransporter()

// Function to send assignment notification emails
const sendAssignmentNotification = async (assignment, facultyName, students) => {
  if (!transporter) {
    console.log('📧 Email service not available - skipping notifications')
    return
  }

  try {
    const emailPromises = students.map(async (student) => {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: student.email,
        subject: `📚 New Assignment: ${assignment.title} - ${assignment.className}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
            <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #667eea; margin: 0; font-size: 28px;">🎯 New Assignment Alert</h1>
                <p style="color: #6c757d; font-size: 16px;">You have a new assignment to complete</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="margin: 0 0 10px 0; font-size: 22px;">${assignment.title}</h2>
                <p style="margin: 0; opacity: 0.9;">Class: ${assignment.className}</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #495057; margin-bottom: 10px;">📝 Assignment Details:</h3>
                <p style="color: #6c757d; line-height: 1.6; margin: 0;">
                  ${assignment.description || 'No additional description provided.'}
                </p>
              </div>

              <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; margin-bottom: 25px;">
                <p style="margin: 0; color: #495057;">
                  <strong>👨‍🏫 Faculty:</strong> ${facultyName}<br>
                  <strong>📅 Created:</strong> ${new Date(assignment.createdAt).toLocaleDateString()}
                </p>
              </div>

              ${assignment.fileUrl ? `
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="http://localhost:5000${assignment.fileUrl}" 
                   style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                   📎 Download Assignment File
                </a>
              </div>
              ` : ''}

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="color: #6c757d; font-size: 14px; margin: 0;">
                  Please log in to your EduPulse account to submit your work.
                </p>
                <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
                  This is an automated notification. Please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        `
      }

      return transporter.sendMail(mailOptions)
    })

    const results = await Promise.allSettled(emailPromises)
    
    // Log results
    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length
    
    console.log(`📧 Assignment notifications sent: ${successful} successful, ${failed} failed`)
    
    if (failed > 0) {
      console.log('❌ Failed emails:', results.filter(result => result.status === 'rejected').map(r => r.reason))
    }

  } catch (error) {
    console.error('❌ Error sending assignment notifications:', error)
  }
}

// ✅ Faculty: create assignment and notify students
export const createAssignment = async (req, res) => {
  try {
    const { title, description, className } = req.body

    if (!title || !description || !className) {
      return res.status(400).json({ 
        success: false,
        message: 'Title, description, and class are required' 
      })
    }

    // Validate className against enum values
    const validClassNames = [
      'E1 CSE-A', 'E1 CSE-B', 'E1 CSE-C', 'E1 CSE-D',
      'E2 CSE-A', 'E2 CSE-B', 'E2 CSE-C', 'E2 CSE-D',
      'E3 CSE-A', 'E3 CSE-B', 'E3 CSE-C', 'E3 CSE-D',
      'E4 CSE-A', 'E4 CSE-B', 'E4 CSE-C', 'E4 CSE-D'
    ]

    if (!validClassNames.includes(className)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid class name provided'
      })
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : ''

    const assignment = await Assignment.create({
      title,
      description,
      className,
      fileUrl,
      faculty: req.user._id,
    })

    // Get faculty info for email
    const faculty = await User.findById(req.user._id).select('name email')
    
    // Find all students in the class
    const students = await User.find({ 
      role: 'Student', 
      className: className,
      isVerified: true 
    }).select('name email')

    console.log(`👨‍🎓 Found ${students.length} students in class ${className}`)

    // Send email notifications (non-blocking)
    if (students.length > 0) {
      sendAssignmentNotification(assignment, faculty.name, students)
    }

    res.status(201).json({ 
      success: true,
      message: 'Assignment created successfully', 
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        className: assignment.className,
        fileUrl: assignment.fileUrl,
        faculty: assignment.faculty,
        createdAt: assignment.createdAt
      },
      notificationsSent: students.length
    })

  } catch (error) {
    console.error('❌ Error creating assignment:', error)
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating assignment' 
    })
  }
}

// ✅ Student: get assignments for their class
export const getAssignmentsByClass = async (req, res) => {
  try {
    const { className } = req.params
    
    const assignments = await Assignment.find({ className })
      .populate('faculty', 'name email')
      .sort({ createdAt: -1 })
    
    res.json({
      success: true,
      assignments
    })
  } catch (error) {
    console.error('❌ Error fetching class assignments:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching assignments' 
    })
  }
}

// ✅ Faculty: get only their own created assignments
export const getAssignmentsByTeacher = async (req, res) => {
  try {
    const teacherId = req.user._id
    
    const assignments = await Assignment.find({ faculty: teacherId })
      .populate('faculty', 'name email')
      .sort({ createdAt: -1 })
    
    res.json({
      success: true,
      assignments
    })
  } catch (error) {
    console.error('❌ Error fetching faculty assignments:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching your assignments' 
    })
  }
}

// ✅ Student: get assignments with submission status
export const getAssignmentsForStudent = async (req, res) => {
  try {
    const student = req.user

    // Get all assignments for student's class with faculty info
    const assignments = await Assignment.find({ className: student.className })
      .populate('faculty', 'name email')
      .sort({ createdAt: -1 })

    // Get all submissions done by this student
    const submissions = await Submission.find({ student: student._id })

    // Combine assignment data with submission status
    const result = assignments.map((assignment) => {
      const submission = submissions.find(
        (s) => s.assignment.toString() === assignment._id.toString()
      )
      
      return { 
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        className: assignment.className,
        fileUrl: assignment.fileUrl,
        faculty: assignment.faculty,
        createdAt: assignment.createdAt,
        submitted: !!submission,
        submissionId: submission?._id,
        submittedAt: submission?.submittedAt,
        marks: submission?.marks,
        feedback: submission?.feedback
      }
    })

    res.json({
      success: true,
      assignments: result
    })
  } catch (error) {
    console.error('❌ Error fetching student assignments:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching assignments' 
    })
  }
}