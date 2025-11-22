import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  studentName: { 
    type: String, 
    required: true 
  },
  className: { 
    type: String, 
    required: true 
  },
  subject: { 
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
  date: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'Late'],
    required: true 
  },
  session: { 
    type: String, 
    required: true // e.g., "Morning", "Afternoon", or specific time slot
  }
}, { timestamps: true })

// Compound index to prevent duplicate attendance for same student, subject, and date
attendanceSchema.index({ 
  studentId: 1, 
  subject: 1, 
  date: 1,
  session: 1 
}, { unique: true })

export default mongoose.model('Attendance', attendanceSchema)