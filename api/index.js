const express = require('express')
const {google} = require('googleapis')
const bodyParser = require('body-parser')
const dotenv = require('dotenv').config()
const axios = require('axios')
const app = express()

app.use(bodyParser.urlencoded());

app.listen('3000', (req, res) => {
    console.log("BACKEND RUNNING ON PORT 3000")
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    access_token: process.env.GOOGLE_ACCESS_TOKEN
});

const calendar = google.calendar({
  version: 'v3', 
  auth: oauth2Client
});

app.get('/auth', (req, res) => {
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/calendar',
        include_granted_scopes: true
    })
    res.redirect(authorizationUrl)
})

app.get('/oauth2callback',  async (req, res) => {
    const authCode = req.query
    let {tokens} = await oauth2Client.getToken(authCode)
    console.log(tokens)
    oauth2Client.setCredentials(tokens)
    res.send('Token received!!')
})

app.get('/calendar', async (req, res) => {
    const calendarList = await calendar.calendarList.list()
    const bookingsCalendar = calendarList.data.items.filter((f) => {
        return f.summary == 'Test Praktijk 56'
    }).map((m) => {
        return m.id
    });
    const events = await calendar.events.list({calendarId: bookingsCalendar[0]})
    console.log(events.data.items)

   
})
