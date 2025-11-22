import dotenv from 'dotenv'
import User from '../models/User.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer' // This will work after installation

// Load environment variables
dotenv.config()

// Debug: Check if environment variables are loaded
console.log('🔍 Environment Variables Check:')
console.log('GMAIL_USER:', process.env.GMAIL_USER ? `"${process.env.GMAIL_USER}"` : 'NOT FOUND')
console.log('GMAIL_PASS:', process.env.GMAIL_PASS ? 'SET (hidden)' : 'NOT FOUND')
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT FOUND')
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT FOUND')

// In-memory OTP store (use Redis in production)
const otpStore = new Map()

// Configure Nodemailer
const createTransporter = () => {
  // Verify credentials exist
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error('❌ Gmail credentials missing in environment variables')
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
    console.error('❌ Error creating transporter:', error)
    return null
  }
}

const transporter = createTransporter()

// Verify transporter
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Transporter verification failed:', error)
    } else {
      console.log('✅ Nodemailer transporter verified and ready')
    }
  })
} else {
  console.error('❌ Transporter not created - check credentials')
}

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// Register User — send OTP to Email
export const registerUser = async (req, res) => {
  try {
    const { name, username, email, password, role, className } = req.body

    console.log('📝 Registration attempt:', { name, username, email, role })

    // Check if username already exists
    const existingUsername = await User.findOne({ username })
    if (existingUsername) {
      return res.status(400).json({ 
        success: false,
        message: 'Username already taken. Please choose a different username.' 
      })
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered. Please use a different email or login.' 
      })
    }

    // Create unverified user
    const newUser = new User({
      name,
      username,
      email,
      password,
      role,
      className,
      isVerified: false,
      profilePic: req.file?.path || '',
    })
    await newUser.save()

    console.log('✅ User saved to database:', newUser._id)

    // Generate OTP (6-digit)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    otpStore.set(email, {
      otp,
      userId: newUser._id,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    })

    console.log('📧 Generated OTP:', otp, 'for email:', email)

    // Try to send email if transporter is available
    if (transporter) {
      try {
        console.log('📤 Attempting to send email...')
        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: email,
          subject: 'EduPulse | Email Verification OTP',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #667eea;">Welcome to EduPulse, ${name}!</h2>
              <p>Thank you for registering with EduPulse. Your verification code is:</p>
              <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #667eea; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p>If you didn't request this code, please ignore this email.</p>
              <hr>
              <p style="color: #6c757d; font-size: 12px;">
                EduPulse - Your Learning Management System
              </p>
            </div>
          `
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('✅ Email sent successfully:', info.messageId)
        
        res.status(201).json({ 
          success: true,
          message: 'Registration successful. OTP sent to your email.',
          userId: newUser._id
        })

      } catch (emailError) {
        console.error('❌ Email sending error:', emailError)
        // Fallback: Return OTP in response
        console.log('🔄 Fallback: Returning OTP in response')
        res.status(201).json({ 
          success: true,
          message: 'Registration successful. Check OTP below for verification.',
          userId: newUser._id,
          otp: otp,
          email: email,
          note: 'Email service temporarily unavailable'
        })
      }
    } else {
      // Transporter not available - return OTP in response
      console.log('🚨 Nodemailer not configured - returning OTP in response')
      res.status(201).json({ 
        success: true,
        message: 'Registration successful. Check OTP below for verification.',
        userId: newUser._id,
        otp: otp,
        email: email,
        note: 'Email service not configured'
      })
    }

    // Expire OTP in 5 mins
    setTimeout(() => {
      if (otpStore.get(email)?.otp === otp) {
        otpStore.delete(email)
        console.log('🗑️ OTP expired for email:', email)
      }
    }, 5 * 60 * 1000)

  } catch (err) {
    console.error('❌ Register error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration.' 
    })
  }
}

// Verify OTP — activate user
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body
    console.log('🔐 OTP verification attempt:', { email, otp })
    
    const otpData = otpStore.get(email)
    
    if (!otpData) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP expired or not found. Please request a new one.' 
      })
    }

    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(email)
      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new one.' 
      })
    }

    if (otp !== otpData.otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP. Please try again.' 
      })
    }

    // OTP is valid - verify user
    await User.findByIdAndUpdate(otpData.userId, { 
      isVerified: true 
    })

    // Clean up OTP
    otpStore.delete(email)

    // Generate JWT token for auto-login
    const user = await User.findById(otpData.userId).select('-password')
    const token = generateToken(user)

    console.log('✅ User verified successfully:', user.email)

    res.json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        className: user.className,
        profilePic: user.profilePic,
        isVerified: true
      },
      token
    })

  } catch (err) {
    console.error('❌ OTP verification error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error verifying OTP' 
    })
  }
}

// Resend OTP
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body
    console.log('🔄 Resend OTP request for:', email)

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      })
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'User is already verified' 
      })
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    otpStore.set(email, {
      otp,
      userId: user._id,
      expiresAt: Date.now() + 5 * 60 * 1000
    })

    console.log('📧 New OTP generated:', otp)

    // Try to send email if transporter is available
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: email,
          subject: 'EduPulse | New Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #667eea;">New Verification Code</h2>
              <p>Hello ${user.name},</p>
              <p>Your new verification code is:</p>
              <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #667eea; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <hr>
              <p style="color: #6c757d; font-size: 12px;">
                EduPulse - Your Learning Management System
              </p>
            </div>
          `
        })
        console.log('✅ New OTP sent to:', email)

        res.json({ 
          success: true,
          message: 'New OTP sent successfully!' 
        })
      } catch (emailError) {
        console.error('❌ Email sending error:', emailError)
        // Fallback: Return OTP in response
        res.json({ 
          success: true,
          message: 'New OTP generated successfully!',
          otp: otp,
          note: 'Email service temporarily unavailable'
        })
      }
    } else {
      // Transporter not available - return OTP in response
      res.json({ 
        success: true,
        message: 'New OTP generated successfully!',
        otp: otp,
        note: 'Email service not configured'
      })
    }

  } catch (err) {
    console.error('❌ Resend OTP error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error resending OTP' 
    })
  }
}

// Normal Login
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body
    console.log('🔑 Login attempt for username:', username)

    const user = await User.findOne({ username })
    if (!user) return res.status(400).json({ 
      success: false,
      message: 'User not found' 
    })

    if (!user.isVerified)
      return res.status(403).json({ 
        success: false,
        message: 'Account not verified. Please verify your email first.' 
      })

    const isMatch = await user.matchPassword(password)
    if (!isMatch) return res.status(400).json({ 
      success: false,
      message: 'Invalid credentials' 
    })

    const token = generateToken(user)
    
    console.log('✅ Login successful for:', username)

    res.json({ 
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        className: user.className,
        profilePic: user.profilePic,
        isVerified: user.isVerified
      }, 
      token 
    })
  } catch (err) {
    console.error('❌ Login error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Login failed' 
    })
  }
}

// Google Auth
export const googleAuth = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Google Auth not yet implemented — coming soon!' 
    })
  } catch (err) {
    console.error('Google auth error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Google authentication failed' 
    })
  }
}