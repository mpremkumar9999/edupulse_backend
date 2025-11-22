import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const validClassNames = [
  'E1 CSE-A', 'E1 CSE-B', 'E1 CSE-C', 'E1 CSE-D',
  'E2 CSE-A', 'E2 CSE-B', 'E2 CSE-C', 'E2 CSE-D',
  'E3 CSE-A', 'E3 CSE-B', 'E3 CSE-C', 'E3 CSE-D',
  'E4 CSE-A', 'E4 CSE-B', 'E4 CSE-C', 'E4 CSE-D'
]

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    username: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: { 
      type: String,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['Admin', 'Faculty', 'Student'],
      required: true
    },
    className: {
      type: String,
      enum: validClassNames,
      required: function() {
        return this.role === 'Student'; // Only required for Students
      }
    },
    profilePic: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    googleId: { type: String, default: null },
    
    // ✅ ADD ONLINE STATUS FIELDS
    isOnline: { 
      type: Boolean, 
      default: false 
    },
    lastSeen: { 
      type: Date, 
      default: Date.now 
    },
    socketId: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
)

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// ✅ ADD METHOD TO UPDATE ONLINE STATUS
userSchema.methods.updateOnlineStatus = async function(isOnline, socketId = null) {
  this.isOnline = isOnline;
  this.lastSeen = new Date();
  this.socketId = socketId;
  return await this.save();
}

export default mongoose.model('User', userSchema)