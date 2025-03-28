const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(express.json());

// Decode service account key from base64 env variable (for Render)
if (process.env.GOOGLE_SERVICE_KEY_BASE64) {
  const key = Buffer.from(process.env.GOOGLE_SERVICE_KEY_BASE64, 'base64');
  fs.writeFileSync('service-account.json', key);
}

// Auth setup
const auth = new google.auth.GoogleAuth({
  keyFile: './service-account.json',
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3' });

// Check Availability
app.post('/check-availability', async (req, res) => {
  try {
    const { meeting_time } = req.body;
    console.log('MEETING TIME:', meeting_time);

    const authClient = await auth.getClient();
    const start = new Date(meeting_time).toISOString();
    const end = new Date(new Date(meeting_time).getTime() + 30 * 60000).toISOString();

    const response = await calendar.events.list({
      auth: authClient,
      calendarId: process.env.CALENDAR_ID,
      timeMin: start,
      timeMax: end,
      singleEvents: true,
    });

    const isAvailable = response.data.items.length === 0;
    res.json({ available: isAvailable });
  } catch (err) {
    console.error('Availability check failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Book Meeting
app.post('/book-meeting', async (req, res) => {
  try {
    const { meeting_time, summary, description } = req.body;

    const authClient = await auth.getClient();

    const event = {
      summary: summary || 'Security Company Meeting',
      description: description || 'Auto-booked by Supervisor Assistant',
      start: {
        dateTime: new Date(meeting_time).toISOString(),
        timeZone: 'America/Chicago',
      },
      end: {
        dateTime: new Date(new Date(meeting_time).getTime() + 30 * 60000).toISOString(),
        timeZone: 'America/Chicago',
      },
    };

    const response = await calendar.events.insert({
      auth: authClient,
      calendarId: process.env.CALENDAR_ID,
      resource: event,
    });

    res.status(200).json({ success: true, eventId: response.data.id });
  } catch (err) {
    console.error('Booking failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
