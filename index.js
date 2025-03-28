const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

const fs = require("fs");

if (process.env.GOOGLE_SERVICE_KEY_BASE64) {
  const key = Buffer.from(process.env.GOOGLE_SERVICE_KEY_BASE64, "base64");
  fs.writeFileSync("service-account.json", key);
}


const auth = new google.auth.GoogleAuth({
  keyFile: './service-account.json',
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3' });

app.post('/check-availability', async (req, res) => {
  try {
    const meeting_time = req.body.meeting_time;
    console.log("MEETING TIME:", meeting_time);


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
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/create-meeting', async (req, res) => {
  try {
    const { officer_name, meeting_time } = req.body;

    const authClient = await auth.getClient();
    const start = new Date(meeting_time).toISOString();
    const end = new Date(new Date(meeting_time).getTime() + 30 * 60000).toISOString();

    const event = {
      summary: `Meeting with Officer ${officer_name}`,
      start: { dateTime: start },
      end: { dateTime: end },
    };

    await calendar.events.insert({
      auth: authClient,
      calendarId: process.env.CALENDAR_ID,
      requestBody: event,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Meeting creation failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
