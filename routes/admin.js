import express from 'express'
import User from '../models/User.js'
import Feedback from '../models/Feedback.js'
import Attendance from '../models/Attendance.js'
import { protect } from '../middleware/authMiddleware.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = express.Router()

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  const dir = 'uploads/profile-pics'
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureUploadsDir()
    cb(null, 'uploads/profile-pics/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'), false)
    }
  }
})

// Admin middleware - uses your existing protect middleware
const adminAuth = async (req, res, next) => {
  try {
    // First, apply the protect middleware
    await new Promise((resolve, reject) => {
      protect(req, res, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    // Then check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      })
    }
    
    next()
  } catch (error) {
    console.error('Admin auth error:', error)
    res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    })
  }
}

// Get dashboard statistics
router.get('/dashboard-stats', adminAuth, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'Student' })
    const totalFaculty = await User.countDocuments({ role: 'Faculty' })
    const totalAdmins = await User.countDocuments({ role: 'Admin' })
    const totalUsers = totalStudents + totalFaculty + totalAdmins
    
    // Get recent users (last 5)
    const recentUsers = await User.find()
      .select('name role className createdAt isOnline lastSeen')
      .sort({ createdAt: -1 })
      .limit(5)

    const recentActivity = recentUsers.map(user => ({
      message: `${user.role} ${user.name} ${user.role === 'Student' ? `(${user.className})` : ''} ${user.isOnline ? 'logged in' : 'registered'}`,
      time: user.isOnline ? 'Online now' : new Date(user.lastSeen).toLocaleDateString()
    }))

    // Add some sample activities
    recentActivity.unshift(
      { message: 'System maintenance completed', time: '2 hours ago' },
      { message: 'New academic year started', time: '1 day ago' }
    )

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalFaculty,
        totalAdmins,
        totalUsers,
        recentActivity: recentActivity.slice(0, 5)
      }
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load dashboard statistics' 
    })
  }
})

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json({ 
      success: true, 
      users,
      count: users.length 
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load users' 
    })
  }
})

// Update user
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, username, className, role, profilePic } = req.body
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      })
    }

    // Check if email already exists (for other users)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } })
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        })
      }
    }

    // Check if username already exists (for other users)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: user._id } })
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username already exists' 
        })
      }
    }

    user.name = name || user.name
    user.email = email || user.email
    user.username = username || user.username
    user.role = role || user.role
    
    // Update profile picture if provided
    if (profilePic) {
      user.profilePic = profilePic
    }
    
    if (role === 'Student') {
      user.className = className || user.className
    } else {
      user.className = undefined
    }

    await user.save()

    // Return updated user without password
    const updatedUser = await User.findById(user._id).select('-password')

    res.json({ 
      success: true, 
      message: 'User updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Update user error:', error)
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email already exists' 
      })
    }
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user' 
    })
  }
})

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      })
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      })
    }

    await User.findByIdAndDelete(req.params.id)
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user' 
    })
  }
})

// Create new user (admin only)
router.post('/users', adminAuth, async (req, res) => {
  try {
    const { name, email, username, password, role, className } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      })
    }

    const userData = {
      name,
      email,
      username,
      password, // Will be hashed by the User model pre-save hook
      role,
      isVerified: true // Admin created users are automatically verified
    }

    if (role === 'Student') {
      userData.className = className
    }

    const user = new User(userData)
    await user.save()

    // Return user without password
    const newUser = await User.findById(user._id).select('-password')

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    })
  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    })
  }
})

// Get students with actual attendance data
router.get('/students-attendance', adminAuth, async (req, res) => {
  try {
    const students = await User.find({ role: 'Student' }).select('-password')
    
    // Get actual attendance data for each student
    const studentsWithAttendance = await Promise.all(
      students.map(async (student) => {
        try {
          const attendanceStats = await Attendance.aggregate([
            { $match: { studentId: student._id } },
            {
              $group: {
                _id: '$studentId',
                totalClasses: { $sum: 1 },
                presentClasses: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Present'] }, 1, 0]
                  }
                }
              }
            }
          ])

          const stats = attendanceStats.length > 0 ? attendanceStats[0] : {
            totalClasses: 0,
            presentClasses: 0
          }

          const attendancePercentage = stats.totalClasses > 0 
            ? Math.round((stats.presentClasses / stats.totalClasses) * 100)
            : 0

          return {
            ...student.toObject(),
            attendancePercentage,
            totalClasses: stats.totalClasses,
            presentClasses: stats.presentClasses
          }
        } catch (error) {
          console.error(`Error processing student ${student._id}:`, error)
          // Return student with default values if there's an error
          return {
            ...student.toObject(),
            attendancePercentage: 0,
            totalClasses: 0,
            presentClasses: 0
          }
        }
      })
    )

    res.json({
      success: true,
      students: studentsWithAttendance
    })
  } catch (error) {
    console.error('Students attendance error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load students with attendance' 
    })
  }
})

// Get faculty with actual feedback data
router.get('/faculty-feedback', adminAuth, async (req, res) => {
  try {
    const faculty = await User.find({ role: 'Faculty' }).select('-password')
    
    // Get actual feedback data for each faculty
    const facultyWithFeedback = await Promise.all(
      faculty.map(async (facultyMember) => {
        try {
          const feedbackStats = await Feedback.aggregate([
            { $match: { facultyId: facultyMember._id } },
            {
              $group: {
                _id: '$facultyId',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
              }
            }
          ])

          const stats = feedbackStats.length > 0 ? feedbackStats[0] : {
            averageRating: 0,
            totalReviews: 0
          }

          // Ensure averageRating is a number
          const avgRating = stats.averageRating ? Number(stats.averageRating.toFixed(1)) : 0

          return {
            ...facultyMember.toObject(),
            averageRating: avgRating,
            totalReviews: stats.totalReviews || 0
          }
        } catch (error) {
          console.error(`Error processing faculty ${facultyMember._id}:`, error)
          // Return faculty with default values if there's an error
          return {
            ...facultyMember.toObject(),
            averageRating: 0,
            totalReviews: 0
          }
        }
      })
    )

    res.json({
      success: true,
      faculty: facultyWithFeedback
    })
  } catch (error) {
    console.error('Faculty feedback error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load faculty with feedback' 
    })
  }
})

// Upload profile picture
router.post('/users/:id/profile-pic', adminAuth, upload.single('profilePic'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    // Update user's profile picture path
    user.profilePic = req.file.path
    await user.save()

    res.json({
      success: true,
      profilePic: req.file.path,
      message: 'Profile picture updated successfully'
    })
  } catch (error) {
    console.error('Profile picture upload error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload profile picture' 
    })
  }
})

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      })
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed!'
    })
  }
  
  console.error('Multer error:', error)
  res.status(500).json({
    success: false,
    message: 'File upload failed'
  })
})

export default router