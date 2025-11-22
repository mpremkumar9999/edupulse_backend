import mongoose from 'mongoose'

const contentSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 1000
  },
  className: { 
    type: String, 
    required: true,
    enum: [
      'E1 CSE-A', 'E1 CSE-B', 'E1 CSE-C', 'E1 CSE-D',
      'E2 CSE-A', 'E2 CSE-B', 'E2 CSE-C', 'E2 CSE-D',
      'E3 CSE-A', 'E3 CSE-B', 'E3 CSE-C', 'E3 CSE-D',
      'E4 CSE-A', 'E4 CSE-B', 'E4 CSE-C', 'E4 CSE-D'
    ]
  },
  faculty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  fileUrl: { 
    type: String, 
    default: '' 
  },
  fileName: { 
    type: String, 
    default: '' 
  },
  fileSize: { 
    type: Number, 
    default: 0 
  },
  fileType: { 
    type: String, 
    default: '' 
  },
  isImportant: { 
    type: Boolean, 
    default: false 
  },
  tags: [{ 
    type: String, 
    trim: true 
  }]
}, { timestamps: true })

// Index for better performance
contentSchema.index({ className: 1, createdAt: -1 })
contentSchema.index({ faculty: 1, createdAt: -1 })

export default mongoose.model('Content', contentSchema)