import Content from '../models/Content.js'
import User from '../models/User.js'
import nodemailer from 'nodemailer'

// Configure Nodemailer
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

// Function to send content notification emails
const sendContentNotification = async (content, facultyName, students) => {
  if (!transporter) {
    console.log('📧 Email service not available - skipping notifications')
    return
  }

  try {
    const emailPromises = students.map(async (student) => {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: student.email,
        subject: `📚 New Study Material: ${content.title} - ${content.className}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
            <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #667eea; margin: 0; font-size: 28px;">📖 New Study Material</h1>
                <p style="color: #6c757d; font-size: 16px;">Your faculty has shared new learning resources</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="margin: 0 0 10px 0; font-size: 22px;">${content.title}</h2>
                <p style="margin: 0; opacity: 0.9;">Class: ${content.className}</p>
                ${content.isImportant ? `<span style="background: #ffc107; color: #000; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">⭐ Important</span>` : ''}
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #495057; margin-bottom: 10px;">📝 Content Description:</h3>
                <p style="color: #6c757d; line-height: 1.6; margin: 0;">
                  ${content.description || 'No additional description provided.'}
                </p>
              </div>

              <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; margin-bottom: 25px;">
                <p style="margin: 0; color: #495057;">
                  <strong>👨‍🏫 Shared by:</strong> ${facultyName}<br>
                  <strong>📅 Shared on:</strong> ${new Date(content.createdAt).toLocaleDateString()}
                  ${content.tags && content.tags.length > 0 ? `<br><strong>🏷️ Tags:</strong> ${content.tags.join(', ')}` : ''}
                </p>
              </div>

              ${content.fileUrl ? `
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="http://localhost:5000${content.fileUrl}" 
                   style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                   📎 Download Study Material
                </a>
                <p style="color: #6c757d; font-size: 12px; margin: 8px 0 0 0;">
                  File: ${content.fileName || 'Study Material'} (${(content.fileSize / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
              ` : ''}

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="color: #6c757d; font-size: 14px; margin: 0;">
                  Please log in to your EduPulse account to access all shared materials.
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
    
    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length
    
    console.log(`📧 Content notifications sent: ${successful} successful, ${failed} failed`)
    
    if (failed > 0) {
      console.log('❌ Failed emails:', results.filter(result => result.status === 'rejected').map(r => r.reason))
    }

  } catch (error) {
    console.error('❌ Error sending content notifications:', error)
  }
}

// ✅ Faculty: create content and notify students
export const createContent = async (req, res) => {
  try {
    const { title, description, className, isImportant, tags } = req.body

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
    const fileName = req.file ? req.file.originalname : ''
    const fileSize = req.file ? req.file.size : 0
    const fileType = req.file ? req.file.mimetype : ''

    const content = await Content.create({
      title,
      description,
      className,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      isImportant: isImportant === 'true',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
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
      sendContentNotification(content, faculty.name, students)
    }

    // Populate faculty info for response
    await content.populate('faculty', 'name email')

    res.status(201).json({ 
      success: true,
      message: 'Content shared successfully', 
      content,
      notificationsSent: students.length
    })

  } catch (error) {
    console.error('❌ Error sharing content:', error)
    res.status(500).json({ 
      success: false,
      message: 'Server error while sharing content' 
    })
  }
}

// ✅ Get content by class (for faculty viewing their shared content)
export const getContentByClass = async (req, res) => {
  try {
    const { className } = req.params
    
    const content = await Content.find({ className })
      .populate('faculty', 'name email profilePic')
      .sort({ isImportant: -1, createdAt: -1 })
    
    res.json({
      success: true,
      content
    })
  } catch (error) {
    console.error('❌ Error fetching class content:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching shared content' 
    })
  }
}

// ✅ Faculty: get only their own shared content
export const getContentByFaculty = async (req, res) => {
  try {
    const facultyId = req.user._id
    
    const content = await Content.find({ faculty: facultyId })
      .populate('faculty', 'name email profilePic')
      .sort({ createdAt: -1 })
    
    res.json({
      success: true,
      content
    })
  } catch (error) {
    console.error('❌ Error fetching faculty content:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching your shared content' 
    })
  }
}

// ✅ Student: get content for their class
export const getContentForStudent = async (req, res) => {
  try {
    const student = req.user

    // Get all content for student's class with faculty info
    const content = await Content.find({ className: student.className })
      .populate('faculty', 'name email profilePic')
      .sort({ isImportant: -1, createdAt: -1 })

    res.json({
      success: true,
      content
    })
  } catch (error) {
    console.error('❌ Error fetching student content:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching shared content' 
    })
  }
}

// ✅ Faculty: delete their content
export const deleteContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      })
    }

    // Check if the content belongs to the faculty
    if (content.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this content'
      })
    }

    await Content.findByIdAndDelete(req.params.id)
    
    res.json({
      success: true,
      message: 'Content deleted successfully'
    })
  } catch (error) {
    console.error('❌ Error deleting content:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error deleting content' 
    })
  }
}

// ✅ Faculty: update their content
export const updateContent = async (req, res) => {
  try {
    const { title, description, isImportant, tags } = req.body
    
    const content = await Content.findById(req.params.id)
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      })
    }

    // Check if the content belongs to the faculty
    if (content.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this content'
      })
    }

    // Update fields
    content.title = title || content.title
    content.description = description || content.description
    content.isImportant = isImportant === 'true' || content.isImportant
    content.tags = tags ? tags.split(',').map(tag => tag.trim()) : content.tags

    // Update file if new file is uploaded
    if (req.file) {
      content.fileUrl = `/uploads/${req.file.filename}`
      content.fileName = req.file.originalname
      content.fileSize = req.file.size
      content.fileType = req.file.mimetype
    }

    await content.save()
    await content.populate('faculty', 'name email profilePic')

    res.json({
      success: true,
      message: 'Content updated successfully',
      content
    })
  } catch (error) {
    console.error('❌ Error updating content:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error updating content' 
    })
  }
}