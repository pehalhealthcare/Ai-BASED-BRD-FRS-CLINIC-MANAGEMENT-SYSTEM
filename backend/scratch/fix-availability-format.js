const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

const parse12To24 = (timeStr) => {
  if (!timeStr) return '09:00';
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr; // Already 24h
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return '09:00';
  let hrs = Number(match[1]);
  const mins = Number(match[2]);
  const ampm = match[3];
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
    if (ampm.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
  }
  const hrsStr = hrs < 10 ? `0${hrs}` : hrs;
  const minsStr = mins < 10 ? `0${mins}` : mins;
  return `${hrsStr}:${minsStr}`;
};

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const doctors = await Doctor.find({ approvalStatus: 'approved' });
    console.log(`Checking ${doctors.length} approved doctors...`);
    
    for (const doc of doctors) {
      if (!doc.availability || doc.availability.length === 0) continue;
      
      let updated = false;
      const newAvail = doc.availability.map((slot) => {
        const newStart = parse12To24(slot.startTime);
        const newEnd = parse12To24(slot.endTime);
        if (slot.startTime !== newStart || slot.endTime !== newEnd) {
          console.log(`Updating ${doc.fullName} ${slot.dayOfWeek}: ${slot.startTime} -> ${newStart}, ${slot.endTime} -> ${newEnd}`);
          slot.startTime = newStart;
          slot.endTime = newEnd;
          updated = true;
        }
        return slot;
      });
      
      if (updated) {
        await Doctor.updateOne({ _id: doc._id }, { $set: { availability: newAvail } });
        console.log(`Saved doctor ${doc.fullName}`);
      }
    }
    
    await mongoose.disconnect();
  })
  .catch(err => console.error(err));
