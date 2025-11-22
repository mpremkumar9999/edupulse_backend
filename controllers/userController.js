import User from '../models/User.js'
import asyncHandler from 'express-async-handler'

// ✅ GET ALL USERS
export const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find().select('-password')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ✅ GET USER BY ID
export const getUserById = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ✅ UPDATE PROFILE
export const updateProfile = asyncHandler(async (req, res) => {
  try {
    const { name, className, subjects } = req.body
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.name = name || user.name
    if (req.file) user.profilePic = `/uploads/${req.file.filename}`

    if (user.role === 'Student' && className) {
      user.className = className
    }

    if (user.role === 'Faculty' && subjects) {
      user.subjects =
        typeof subjects === 'string'
          ? subjects.split(',').map((s) => s.trim())
          : subjects
    }

    const updated = await user.save()
    res.json({
      _id: updated._id,
      name: updated.name,
      username: updated.username,
      role: updated.role,
      className: updated.className,
      subjects: updated.subjects,
      profilePic: updated.profilePic
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ✅ GET USER REWARDS (Placeholder)
export const getUserRewards = asyncHandler(async (req, res) => {
  try {
    res.json({ message: 'Rewards feature coming soon!' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ✅ GET ALL FACULTIES
export const getFaculties = asyncHandler(async (req, res) => {
  try {
    console.log('📋 Fetching faculties from database...');
    
    const faculties = await User.find({ role: 'Faculty' })
      .select('name username email subjects department profilePic isOnline lastSeen')
      .lean();

    console.log(`✅ Found ${faculties.length} faculties`);

    res.json({
      success: true,
      faculties: faculties || []
    });

  } catch (error) {
    console.error('❌ Error in getFaculties:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculties',
      error: error.message
    });
  }
})

// ✅ GET ALL STUDENTS
export const getStudents = asyncHandler(async (req, res) => {
  try {
    const students = await User.find({ role: 'Student' })
      .select('name username email className profilePic isOnline lastSeen')
      .lean();

    res.json({
      success: true,
      students: students
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students'
    });
  }
})

// ✅ GET CHAT USERS (NEW - For chat functionality)
export const getChatUsers = asyncHandler(async (req, res) => {
  try {
    const currentUser = req.user;
    
    console.log('📞 Fetching chat users for:', currentUser._id);
    
    // Get all users except current user with chat-related fields
    const users = await User.find(
      { _id: { $ne: currentUser._id } },
      'name username email role profilePic isOnline lastSeen createdAt className subjects'
    ).sort({ isOnline: -1, name: 1 }); // Online users first, then by name

    console.log(`👥 Found ${users.length} users for chat`);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('❌ Error fetching chat users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: error.message
    });
  }
})

// ✅ GET ONLINE USERS (Optional - for real-time status)
export const getOnlineUsers = asyncHandler(async (req, res) => {
  try {
    const onlineUsers = await User.find(
      { isOnline: true },
      'name username role profilePic lastSeen'
    ).sort({ name: 1 });

    res.json({
      success: true,
      onlineUsers,
      count: onlineUsers.length
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching online users'
    });
  }
})