const { Router } = require('express');
const mongoose = require('mongoose');
const { sendDemoBookingEmails, sendCustomerSupportEmails } = require('./supportEmail.service');
const { logger } = require('../../common/utils/logger');

const router = Router();

// Mongoose schema for SupportTicket / DemoBooking
const SupportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['support', 'demo'], default: 'support' },
  firstName: { type: String, required: true },
  lastName: { type: String, default: '' },
  fullName: { type: String },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  clinicName: { type: String, required: true },
  role: { type: String, default: 'Clinic Staff' },
  department: { type: String, default: 'General Inquiry' },
  priority: { type: String, default: 'Normal' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  doctorsCount: { type: String },
  requestedDate: { type: String },
  requestedTime: { type: String },
  topics: { type: String },
  status: { type: String, default: 'Open' },
  emailStatus: { type: String, default: 'pending' },
  ipAddress: String,
  browserMetadata: String,
  createdAt: { type: Date, default: Date.now }
});

const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);

/**
 * Helper to check if a demo slot datetime in Asia/Kolkata timezone has already elapsed
 */
function isSlotInPastKolkata(selectedDateStr, selectedTimeStr) {
  try {
    const now = new Date();
    const kolkataFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = kolkataFormatter.formatToParts(now);
    const partMap = {};
    parts.forEach(p => { partMap[p.type] = parseInt(p.value, 10); });
    const currentKolkataMs = new Date(partMap.year, partMap.month - 1, partMap.day, partMap.hour, partMap.minute, partMap.second).getTime();

    // Parse requested time e.g. "12:30 PM", "10:00 AM", "5:00 PM"
    const timeMatch = (selectedTimeStr || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return false;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const parsedDate = new Date(selectedDateStr);
    if (isNaN(parsedDate.getTime())) return false;

    const slotKolkataMs = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), hours, minutes, 0).getTime();

    return slotKolkataMs <= currentKolkataMs;
  } catch (err) {
    return false;
  }
}

/**
 * GET /api/v1/support/demo/availability
 * Returns availability window, bookable dates for a given month/year, and available time slots.
 */
router.get('/demo/availability', async (req, res) => {
  try {
    const now = new Date();
    const kolkataFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = kolkataFormatter.formatToParts(now);
    const partMap = {};
    parts.forEach(p => { partMap[p.type] = parseInt(p.value, 10); });

    const currentYear = partMap.year;
    const currentMonth = partMap.month - 1; // 0-indexed
    const todayDate = partMap.day;

    const maxMonthsAhead = 3; // Allows booking up to 3 future months ahead
    const minNavDate = new Date(currentYear, currentMonth, 1);
    const maxNavDate = new Date(currentYear, currentMonth + maxMonthsAhead, 1);

    const reqYear = parseInt(req.query.year, 10) || currentYear;
    const reqMonth = req.query.month !== undefined ? parseInt(req.query.month, 10) : currentMonth;

    const targetDate = new Date(reqYear, reqMonth, 1);
    const isBeforeMin = targetDate < minNavDate;
    const isAfterMax = targetDate > maxNavDate;

    // Standard demo time slots
    const standardTimeSlots = [
      { label: '10:00 AM', minute: 0, hour: 10 },
      { label: '11:00 AM', minute: 0, hour: 11 },
      { label: '12:30 PM', minute: 30, hour: 12 },
      { label: '2:00 PM', minute: 0, hour: 14 },
      { label: '3:30 PM', minute: 30, hour: 15 },
      { label: '5:00 PM', minute: 0, hour: 17 }
    ];

    // Check if today has any remaining slots in Asia/Kolkata
    const remainingTodaySlots = standardTimeSlots.filter(slot => {
      if (slot.hour < partMap.hour) return false;
      if (slot.hour === partMap.hour && slot.minute <= partMap.minute) return false;
      return true;
    });
    const hasRemainingToday = remainingTodaySlots.length > 0;

    // Determine nearest available date across booking window (checking all future dates with slots)
    let nextAvailable = null;
    if (hasRemainingToday) {
      nextAvailable = {
        year: currentYear,
        month: currentMonth,
        day: todayDate,
        isToday: true
      };
    } else {
      let found = false;
      for (let mOffset = 0; mOffset <= maxMonthsAhead && !found; mOffset++) {
        const checkDate = new Date(currentYear, currentMonth + mOffset, 1);
        const cYear = checkDate.getFullYear();
        const cMonth = checkDate.getMonth();
        const totalDays = new Date(cYear, cMonth + 1, 0).getDate();
        const startDay = (mOffset === 0) ? todayDate + 1 : 1;

        for (let d = startDay; d <= totalDays; d++) {
          nextAvailable = {
            year: cYear,
            month: cMonth,
            day: d,
            isToday: false
          };
          found = true;
          break;
        }
      }
    }

    // Find days in requested month
    const daysInMonth = new Date(reqYear, reqMonth + 1, 0).getDate();
    const availableDates = [];
    const dateSlots = {};

    // Populate availability for all valid future dates in the window (including Sundays)
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(reqYear, reqMonth, day);
      d.setHours(0, 0, 0, 0);

      const isPast = d < new Date(currentYear, currentMonth, todayDate);
      const isWithinWindow = !isBeforeMin && !isAfterMax;

      if (!isPast && isWithinWindow) {
        availableDates.push(day);
        dateSlots[day] = standardTimeSlots;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        year: reqYear,
        month: reqMonth,
        minYear: currentYear,
        minMonth: currentMonth,
        maxYear: maxNavDate.getFullYear(),
        maxMonth: maxNavDate.getMonth(),
        maxMonthsAhead,
        availableDates,
        dateSlots,
        hasAvailableDates: availableDates.length > 0,
        timeSlots: standardTimeSlots,
        hasRemainingToday,
        remainingTodaySlotsCount: remainingTodaySlots.length,
        nextAvailableDate: nextAvailable
      }
    });
  } catch (err) {
    logger.error('[support/demo/availability] Error fetching demo availability:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch demo availability.' });
  }
});

/**
 * POST /api/v1/support/demo
 * Dedicated endpoint for Book a Demo form submissions.
 */
router.post('/demo', async (req, res) => {
  try {
    const {
      fullName,
      email,
      workEmail,
      phone,
      phoneNumber,
      clinicName,
      doctorsCount,
      selectedDate,
      preferredDate,
      selectedTime,
      preferredTime,
      topics,
      agree,
      privacyConsent
    } = req.body;

    const rawFullName = (fullName || '').trim();
    const cleanEmail = (email || workEmail || '').trim();
    const cleanPhone = (phone || phoneNumber || '').replace(/\D/g, '');
    const effectiveDate = (selectedDate || preferredDate || '').trim();
    const effectiveTime = (selectedTime || preferredTime || '').trim();
    const effectiveAgree = agree !== undefined ? agree : (privacyConsent !== undefined ? privacyConsent : true);

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^[6-9][0-9]{9}$/;

    if (!rawFullName) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Valid work email is required.' });
    }
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number starting with 6-9 is required.' });
    }
    if (!clinicName || !clinicName.trim()) {
      return res.status(400).json({ success: false, message: 'Clinic or hospital name is required.' });
    }
    if (!doctorsCount) {
      return res.status(400).json({ success: false, message: 'Number of doctors is required.' });
    }
    if (!effectiveDate) {
      return res.status(400).json({ success: false, message: 'Please select an appointment date.' });
    }
    if (!effectiveTime) {
      return res.status(400).json({ success: false, message: 'Please select an appointment time slot.' });
    }
    if (isSlotInPastKolkata(effectiveDate, effectiveTime)) {
      return res.status(400).json({
        success: false,
        message: 'The selected time slot has already elapsed. Please choose an upcoming time slot or another date.'
      });
    }
    if (!effectiveAgree) {
      return res.status(400).json({ success: false, message: 'You must agree to the Terms of Service and Privacy Policy.' });
    }

    const ticketId = `DEMO-${Date.now().toString().slice(-6)}`;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const browserMetadata = req.headers['user-agent'];
    const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

    // Save demo booking to MongoDB database
    const booking = new SupportTicket({
      ticketId,
      type: 'demo',
      firstName: fullName.split(' ')[0] || fullName,
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      fullName,
      email,
      phone,
      clinicName,
      role: `Clinic Head (${doctorsCount})`,
      department: 'Product Demo',
      priority: 'High',
      subject: `PEHAL Demo Booking: ${selectedDate} at ${selectedTime}`,
      message: `Demo Session Request\nClinic: ${clinicName}\nDoctors: ${doctorsCount}\nSchedule: ${selectedDate} at ${selectedTime}\nTopics: ${topics || 'All Modules'}`,
      doctorsCount,
      requestedDate: selectedDate,
      requestedTime: selectedTime,
      topics,
      ipAddress,
      browserMetadata
    });

    await booking.save();

    // Send emails via SMTP configuration
    let emailStatus = 'sent';
    try {
      await sendDemoBookingEmails({
        ticketId,
        fullName,
        email,
        phone,
        clinicName,
        doctorsCount,
        selectedDate,
        selectedTime,
        topics,
        submittedAt
      });
      booking.emailStatus = 'sent';
      await booking.save();
    } catch (mailErr) {
      logger.error('[support/demo] Email sending failed:', mailErr);
      emailStatus = 'failed';
      booking.emailStatus = 'failed';
      await booking.save();
    }

    return res.status(200).json({
      success: true,
      ticketId,
      emailStatus,
      message: emailStatus === 'failed'
        ? 'Demo request received. Our team will contact you shortly.'
        : 'Demo scheduled successfully and confirmation email sent.'
    });
  } catch (err) {
    logger.error('[support/demo] Error processing demo booking:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error while booking demo.' });
  }
});

/**
 * POST /api/v1/support
 * Handles Customer Support tickets and routes demo requests if sent here.
 */
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName = '',
      fullName,
      email,
      phone,
      clinicName,
      role = 'Clinic Owner',
      department = 'General Inquiry',
      priority = 'Normal',
      subject,
      message,
      doctorsCount,
      selectedDate,
      selectedTime,
      topics,
      agree
    } = req.body;

    const isDemo = department === 'Book a Demo Request' || department === 'Product Demo' || !!selectedDate;

    if (isDemo) {
      // Process as Demo Booking
      const effectiveFullName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
      if (!effectiveFullName) {
        return res.status(400).json({ success: false, message: 'Full name is required.' });
      }
      const cleanEmail = (email || '').trim();
      const cleanPhone = (phone || '').replace(/\D/g, '');
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const phoneRegex = /^[6-9][0-9]{9}$/;

      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Valid work email is required.' });
      }
      if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number starting with 6-9 is required.' });
      }
      if (!clinicName || !clinicName.trim()) {
        return res.status(400).json({ success: false, message: 'Clinic or hospital name is required.' });
      }
      if (selectedDate && selectedTime && isSlotInPastKolkata(selectedDate, selectedTime)) {
        return res.status(400).json({
          success: false,
          message: 'The selected time slot has already elapsed. Please choose an upcoming time slot or another date.'
        });
      }

      const ticketId = `DEMO-${Date.now().toString().slice(-6)}`;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const browserMetadata = req.headers['user-agent'];
      const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

      const booking = new SupportTicket({
        ticketId,
        type: 'demo',
        firstName: effectiveFullName.split(' ')[0] || effectiveFullName,
        lastName: effectiveFullName.split(' ').slice(1).join(' ') || '',
        fullName: effectiveFullName,
        email,
        phone,
        clinicName,
        role: role || `Clinic Head (${doctorsCount || '1-5'})`,
        department: 'Product Demo',
        priority: 'High',
        subject: subject || `PEHAL Demo Booking: ${selectedDate || 'Upcoming'} at ${selectedTime || 'Flexible'}`,
        message: message || `Demo Session Request\nClinic: ${clinicName}\nSchedule: ${selectedDate} at ${selectedTime}`,
        doctorsCount,
        requestedDate: selectedDate,
        requestedTime: selectedTime,
        topics,
        ipAddress,
        browserMetadata
      });

      await booking.save();

      let emailStatus = 'sent';
      try {
        await sendDemoBookingEmails({
          ticketId,
          fullName: effectiveFullName,
          email,
          phone,
          clinicName,
          doctorsCount: doctorsCount || '2-5 Doctors',
          selectedDate: selectedDate || new Date().toLocaleDateString(),
          selectedTime: selectedTime || '12:30 PM',
          topics: topics || message,
          submittedAt
        });
        booking.emailStatus = 'sent';
        await booking.save();
      } catch (mailErr) {
        logger.error('[support] Demo email sending failed:', mailErr);
        emailStatus = 'failed';
        booking.emailStatus = 'failed';
        await booking.save();
      }

      return res.status(200).json({
        success: true,
        ticketId,
        emailStatus,
        message: 'Demo scheduled successfully and confirmation email sent.'
      });
    }

    // ── Regular Customer Support Request ──
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ success: false, message: 'First name is required.' });
    }
    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ success: false, message: 'Last name is required.' });
    }
    if (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }
    if (!phone || !phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
    }
    if (!clinicName || !clinicName.trim()) {
      return res.status(400).json({ success: false, message: 'Clinic or hospital name is required.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!message || !message.trim() || message.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });
    }

    const ticketId = `PHL-${Date.now().toString().slice(-6)}`;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const browserMetadata = req.headers['user-agent'];
    const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

    // Save support ticket to MongoDB
    const ticket = new SupportTicket({
      ticketId,
      type: 'support',
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      clinicName,
      role,
      department,
      priority,
      subject,
      message,
      ipAddress,
      browserMetadata
    });

    await ticket.save();

    // Send emails via SMTP configuration
    let emailStatus = 'sent';
    try {
      await sendCustomerSupportEmails({
        ticketId,
        firstName,
        lastName,
        email,
        phone,
        clinicName,
        role,
        department,
        priority,
        subject,
        message,
        ipAddress,
        browserMetadata,
        submittedAt
      });
      ticket.emailStatus = 'sent';
      await ticket.save();
    } catch (mailErr) {
      logger.error('[support] Support email delivery failed:', mailErr);
      emailStatus = 'failed';
      ticket.emailStatus = 'failed';
      await ticket.save();
    }

    return res.status(200).json({
      success: true,
      ticketId,
      emailStatus,
      message: emailStatus === 'failed'
        ? 'Your support request has been received. Our team is reviewing it.'
        : 'Support ticket created successfully and confirmation emails have been sent.'
    });
  } catch (err) {
    logger.error('[support] Failed to submit support ticket:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error while submitting ticket.' });
  }
});

module.exports = router;
