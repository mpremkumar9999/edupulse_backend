import express from 'express'
import upload from '../middleware/upload.js'
import {
  registerUser,
  verifyOtp,
  loginUser,
  googleAuth,
  resendOtp
} from '../controllers/authController.js'

const router = express.Router()

// 1. Register user and send OTP
router.post('/register', upload.single('profilePic'), registerUser)

// 2. Verify OTP during signup
router.post('/verify-otp', verifyOtp)

// 3. Resend OTP (optional, if user missed first mail)
router.post('/resend-otp', resendOtp)

// 4. Normal login (no OTP)
router.post('/login', loginUser)

// 5. Google Sign-In / Sign-Up route (optional)
router.post('/google', googleAuth)

export default router