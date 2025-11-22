import Timetable from '../models/Timetable.js'
import User from '../models/User.js'
import nodemailer from 'nodemailer'

// Time slots configuration
const timeSlots = [
  { start: '08:30', end: '09:30', slot: '1' },
  { start: '09:30', end: '10:30', slot: '2' },
  { start: '10:30', end: '10:45', slot: 'Break1', isBreak: true, breakType: 'Tea Break' },
  { start: '10:45', end: '11:45', slot: '3' },
  { start: '11:45', end: '12:45', slot: '4' },
  { start: '12:45', end: '13:30', slot: 'Lunch', isBreak: true, breakType: 'Lunch Break' },
  { start: '13:30', end: '14:30', slot: '5' },
  { start: '14:30', end: '15:30', slot: '6' },
  { start: '15:30', end: '15:45', slot: 'Break2', isBreak: true, breakType: 'Tea Break' },
  { start: '15:45', end: '16:45', slot: '7' },
  { start: '16:45', end: '17:00', slot: 'Break3', isBreak: true, breakType: 'Short Break' }
]

// Configure Nodemailer
const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error('❌ Gmail credentials missing')
    return null
  }

  try {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER.trim(),
        pass: process.env.GMAIL_PASS.trim(),
      }
    })
  } catch (error) {
    console.error('❌ Error creating transporter:', error)
    return null
  }
}

const transporter = createTransporter()

// Send email notification to students
const sendTimetableUpdateEmail = async (className, facultyName, day, changes, room = '') => {
  try {
    // Find all students in the class
    const students = await User.find({ 
      className: className, 
      role: 'Student',
      isVerified: true 
    })

    if (students.length === 0) {
      console.log(`No students found in class ${className}`)
      return
    }

    const studentEmails = students.map(student => student.email)

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: studentEmails,
      subject: `📅 Timetable Update - ${className}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea; text-align: center;">EduPulse Timetable Update</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Class: ${className}</h3>
            <p style="margin: 5px 0;"><strong>Day:</strong> ${day}</p>
            <p style="margin: 5px 0;"><strong>Faculty:</strong> ${facultyName}</p>
            <p style="margin: 5px 0;"><strong>Changes:</strong> ${changes}</p>
            ${room ? `<p style="margin: 5px 0;"><strong>Room:</strong> ${room}</p>` : ''}
          </div>
          <p style="color: #666; font-size: 14px;">
            This is an automated notification. Please check your updated timetable in the EduPulse portal.
          </p>
          <hr>
          <p style="color: #999; font-size: 12px; text-align: center;">
            EduPulse - Learning Management System
          </p>
        </div>
      `
    }

    if (transporter) {
      await transporter.sendMail(mailOptions)
      console.log(`✅ Timetable update email sent to ${studentEmails.length} students in ${className}`)
    }
  } catch (error) {
    console.error('❌ Error sending timetable update email:', error)
  }
}

// Get timetable for faculty
export const getFacultyTimetable = async (req, res) => {
  try {
    const { facultyId } = req.params

    const timetable = await Timetable.find({ facultyId })
      .sort({ day: 1, startTime: 1 })

    // Generate complete timetable structure
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const completeTimetable = {}

    days.forEach(day => {
      completeTimetable[day] = timeSlots.map(slot => {
        const existingEntry = timetable.find(entry => 
          entry.day === day && entry.timeSlot === slot.slot
        )
        
        if (existingEntry) {
          return existingEntry
        } else if (slot.isBreak) {
          return {
            _id: `break-${day}-${slot.slot}`,
            day,
            timeSlot: slot.slot,
            startTime: slot.start,
            endTime: slot.end,
            subject: slot.breakType,
            isBreak: true,
            breakType: slot.breakType,
            className: 'BREAK'
          }
        } else {
          return {
            _id: `empty-${day}-${slot.slot}`,
            day,
            timeSlot: slot.slot,
            startTime: slot.start,
            endTime: slot.end,
            subject: 'Free',
            className: '',
            isBreak: false,
            isEmpty: true
          }
        }
      })
    })

    res.json({
      success: true,
      timetable: completeTimetable,
      timeSlots
    })
  } catch (err) {
    console.error('❌ Get timetable error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching timetable' 
    })
  }
}

// Create or update timetable entry
export const updateTimetable = async (req, res) => {
  try {
    const { facultyId, day, timeSlot, subject, className, room } = req.body
    const faculty = await User.findById(facultyId)

    if (!faculty) {
      return res.status(404).json({ 
        success: false,
        message: 'Faculty not found' 
      })
    }

    // Find the time slot details
    const slotDetails = timeSlots.find(slot => slot.slot === timeSlot)
    
    if (!slotDetails) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid time slot' 
      })
    }

    // Check if slot is a break
    if (slotDetails.isBreak) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot schedule classes during break time' 
      })
    }

    // Check for conflicts
    const existingConflict = await Timetable.findOne({
      facultyId,
      day,
      timeSlot,
      _id: { $ne: req.body._id } // Exclude current entry if updating
    })

    if (existingConflict) {
      return res.status(400).json({ 
        success: false,
        message: 'Time slot already occupied' 
      })
    }

    let timetableEntry
    const changes = []

    if (req.body._id) {
      // Update existing entry
      const oldEntry = await Timetable.findById(req.body._id)
      changes.push(`Updated: ${oldEntry.subject} (${oldEntry.startTime}-${oldEntry.endTime}) → ${subject}`)
      
      timetableEntry = await Timetable.findByIdAndUpdate(
        req.body._id,
        {
          subject,
          className,
          room,
          startTime: slotDetails.start,
          endTime: slotDetails.end
        },
        { new: true }
      )
    } else {
      // Create new entry
      changes.push(`Added: ${subject} (${slotDetails.start}-${slotDetails.end})`)
      
      timetableEntry = new Timetable({
        facultyId,
        facultyName: faculty.name,
        day,
        timeSlot,
        startTime: slotDetails.start,
        endTime: slotDetails.end,
        subject,
        className,
        room
      })
      await timetableEntry.save()
    }

    // Send email notification to students
    if (className && changes.length > 0) {
      await sendTimetableUpdateEmail(
        className, 
        faculty.name, 
        day, 
        changes.join(', '),
        room // Add room parameter here
      )
    }

    res.json({
      success: true,
      message: 'Timetable updated successfully',
      entry: timetableEntry
    })

  } catch (err) {
    console.error('❌ Update timetable error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error updating timetable' 
    })
  }
}

// Delete timetable entry
export const deleteTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params
    const entry = await Timetable.findById(id)

    if (!entry) {
      return res.status(404).json({ 
        success: false,
        message: 'Timetable entry not found' 
      })
    }

    // Send notification before deleting
    if (entry.className) {
      await sendTimetableUpdateEmail(
        entry.className,
        entry.facultyName,
        entry.day,
        `Cancelled: ${entry.subject} (${entry.startTime}-${entry.endTime})`,
        entry.room // Add room parameter here
      )
    }

    await Timetable.findByIdAndDelete(id)

    res.json({
      success: true,
      message: 'Timetable entry deleted successfully'
    })

  } catch (err) {
    console.error('❌ Delete timetable error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error deleting timetable entry' 
    })
  }
}

// Get timetable by class
export const getClassTimetable = async (req, res) => {
  try {
    const { className } = req.params

    const timetable = await Timetable.find({ className })
      .populate('facultyId', 'name email')
      .sort({ day: 1, startTime: 1 })

    res.json({
      success: true,
      timetable
    })
  } catch (err) {
    console.error('❌ Get class timetable error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching class timetable' 
    })
  }
}

// Bulk update timetable
export const bulkUpdateTimetable = async (req, res) => {
  try {
    const { facultyId, updates } = req.body
    const faculty = await User.findById(facultyId)

    if (!faculty) {
      return res.status(404).json({ 
        success: false,
        message: 'Faculty not found' 
      })
    }

    const results = []
    const classNotifications = {}

    for (const update of updates) {
      const { day, timeSlot, subject, className, room, action } = update
      
      if (action === 'delete' && update._id) {
        await Timetable.findByIdAndDelete(update._id)
        if (className) {
          if (!classNotifications[className]) classNotifications[className] = []
          classNotifications[className].push(`Cancelled: ${subject} (${timeSlot})`)
        }
        continue
      }

      const slotDetails = timeSlots.find(slot => slot.slot === timeSlot)
      
      if (!slotDetails || slotDetails.isBreak) continue

      let timetableEntry

      if (update._id) {
        // Update existing
        timetableEntry = await Timetable.findByIdAndUpdate(
          update._id,
          {
            subject,
            className,
            room,
            startTime: slotDetails.start,
            endTime: slotDetails.end
          },
          { new: true }
        )
        
        if (className) {
          if (!classNotifications[className]) classNotifications[className] = []
          classNotifications[className].push(`Updated: ${subject} (${timeSlot})`)
        }
      } else {
        // Create new
        timetableEntry = new Timetable({
          facultyId,
          facultyName: faculty.name,
          day,
          timeSlot,
          startTime: slotDetails.start,
          endTime: slotDetails.end,
          subject,
          className,
          room
        })
        await timetableEntry.save()
        
        if (className) {
          if (!classNotifications[className]) classNotifications[className] = []
          classNotifications[className].push(`Added: ${subject} (${timeSlot})`)
        }
      }

      results.push(timetableEntry)
    }

    // Send notifications
    for (const [className, changes] of Object.entries(classNotifications)) {
      await sendTimetableUpdateEmail(
        className,
        faculty.name,
        'Multiple Days',
        changes.join(', '),
        '' // Room might not be available in bulk updates, so pass empty string
      )
    }

    res.json({
      success: true,
      message: 'Timetable updated successfully',
      entries: results
    })

  } catch (err) {
    console.error('❌ Bulk update timetable error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error updating timetable' 
    })
  }
}