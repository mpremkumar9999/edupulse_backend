import express from 'express'
import { 
  getAllUsers, 
  getUserRewards, 
  updateProfile, 
  getUserById,
  getFaculties,
  getStudents,
  getChatUsers  // Add this import
} from '../controllers/userController.js'

import { protect } from '../middleware/authMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'

const router = express.Router()

// Existing routes
router.get('/', protect, getAllUsers)
router.get('/rewards', protect, getUserRewards)
router.put('/update', protect, upload.single('profilePic'), updateProfile)
router.get('/:id', protect, getUserById)

// Chat-specific routes
router.get('/chat/users', protect, getChatUsers)        // For chat users list
router.get('/faculties/all', protect, getFaculties)     // For faculties list
router.get('/students/all', protect, getStudents)       // For students list

export default router