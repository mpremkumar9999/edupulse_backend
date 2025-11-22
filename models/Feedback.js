import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  studentName: { 
    type: String, 
    required: true 
  },
  facultyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  facultyName: { 
    type: String, 
    required: true 
  },
  subject: { 
    type: String, 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5 
  },
  comments: { 
    type: String, 
    required: true,
    maxlength: 1000 
  },
  isAnonymous: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true })

export default mongoose.model('Feedback', feedbackSchema)