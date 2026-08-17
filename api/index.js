const express = require('express')
const {google} = require('googleapis')
const bodyParser = require('body-parser')
const dotenv = require('dotenv').config()
const axios = require('axios')
const app = express()
const mongoose = require('mongoose')
const Product = require('../public/js/models/products')
const GoogleTokens = require('../public/js/models/gtokens')
const path = require('path')
let lockedTimeSlots = []

mongoose.connect(process.env.DATABASE_URL)
.then(() => {
    console.log("CONNECTED TO LOCAL DATABASE")
})
.catch((e) => {
    console.log("Error occurred:", e)
})

app.use(express.urlencoded({extended: true}));
app.use(express.json())
app.set('view engine', 'ejs')

app.use(express.static(path.join(__dirname, '../public')))

app.listen('3000', (req, res) => {
    console.log("BACKEND RUNNING ON PORT 3000")
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// to update refresh token in the database
oauth2Client.on('tokens', async (t) => {
    console.log("Token event")
    try {
        const token = await GoogleTokens.find()
        const id = token[0]._id
        if (t.refresh_token) {
            console.log('New refresh token logged!', t.refresh_token)
        await GoogleTokens.findByIdAndUpdate(id, {refreshToken: t.refresh_token});
        console.log('google tokens updated')
    }
    } catch (e) {
        console.log("Error", e)
    }
    
});

// self-invoking function to update google credentials upon server start-up/restart
(async function () {
    try {
        const tokens = await GoogleTokens.find()
        oauth2Client.setCredentials({
        refresh_token: tokens[0].refreshToken,
        access_token: tokens[0].accessToken});

    } catch (e) {
        console.log("Error on self-evoking function:", e)
    }
})();

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
    await new GoogleTokens({
        refreshToken: tokens.refresh_token, 
        accessToken: tokens.access_token
    }).save()
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
    res.send('events received!!')
   
})

app.post('/lockedTimeSlot', (req, res) => {
    console.log('request received', req.query)
    const {t} = req.query
    lockedTimeSlots.push(t)
    console.log(lockedTimeSlots)
    res.send('call received').status(200)
})

app.get('/availability', async (req, res) => {
    const {date, product} = req.query
    const selectedDate = new Date(date)
    /* Time provided is in local timezone ( GMT +2 in summer), hence increasing by 2 to work with UTC time. 
    Will need to address this programmatically to prevent any future issues */
        selectedDate.setHours(selectedDate.getHours() + 2)
    const nextDay = new Date(date); 
    nextDay.setDate(nextDay.getDate() + 1)
    try {
        const calendarList = await calendar.calendarList.list();
        const events = await calendar.events.list({
            calendarId: calendarList.data.items.filter((f) => {
                        return f.summary == 'Test Praktijk 56'
                        }).map((m) => {
                            return m.id
                        }), 
            timeMin: selectedDate, 
            timeMax: nextDay,
        });
        const scheduledEventTimes = events.data.items.map((t) => {
            if (t.recurrence) {
                const eventStart = new Date(selectedDate)
                    eventStart.setHours(new Date(t.start.dateTime).getHours() + 2)
                    eventStart.setMinutes(new Date(t.start.dateTime).getMinutes())
                const eventEnd = new Date(selectedDate)
                    eventEnd.setHours(new Date(t.end.dateTime).getHours() + 2)
                    eventEnd.setMinutes(new Date(t.end.dateTime).getMinutes())
                return {eventStart: eventStart, eventEnd: eventEnd, recurr: t.recurrence[0]}
            } else {
                const eventStart = new Date(t.start.dateTime)
                    eventStart.setHours(eventStart.getHours() + 2)
                const eventEnd = new Date(t.end.dateTime)
                    eventEnd.setHours(eventEnd.getHours() + 2)
                return {eventStart: eventStart, eventEnd: eventEnd}
            }
        });
        const availableTimeSlots = calculateTime(scheduledEventTimes, selectedDate)
        res.send(availableTimeSlots).status(200)
    } catch (e) {
        console.log("Error:", e)
        res.send("Unsuccesful, see logs").status(500)
    }
    
    
})

app.get('/loader', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/loader.html'))
})

app.get('/booking', async (req, res) => {
    const products = await Product.find()
    res.render('boekingen', {products})
})

app.get('/product', async (req, res) => {
    const {id} = req.query
    const product = await Product.findById(id)
    product.name ? res.send(product.name).status(200) : res.send('product was not found').status(500)
})

// Selected date always needs to be at 00:00 on that date. Otherwise certain times won't be returned. 

function calculateTime(events, selectedDate) {
    let treatmentDurationMs = 30 * 60 * 1000;
    const date = new Date(selectedDate);
    date.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(date); 
        nextDay.setDate(date.getDate() + 1);
     /* total spaces available per 24h, based on the treatment duration */
    const spaces = (24 * 60 * 60 * 1000) / treatmentDurationMs;
    let slots = new Date(date);
    const availableTimes = [];
    for(let i = 0; i <= spaces; i++) {
        slots.setTime(slots.getTime() + treatmentDurationMs)
        if (slots.getUTCDate() !== nextDay.getUTCDate()) {
            availableTimes.push(slots.toISOString())
        }
    };
    const today = new Date();
        today.setHours(today.getHours() + 2);
    for (let i = 0; i < events.length; i++) {
        const eventStart = events[i].eventStart.getTime()
        const eventEnd = events[i].eventEnd.getTime()
        for(let t = 0; t < availableTimes.length; t++) {
            const treatmentStart = new Date(availableTimes[t])
            const treatmentEnd = new Date(availableTimes[t])
            treatmentEnd.setTime( treatmentStart.getTime() + treatmentDurationMs)
            if ( treatmentStart.getTime() < today.getTime()) {
                    availableTimes.splice(t, 1)
                    t--
                } else if (treatmentStart.getTime() < eventStart && treatmentEnd.getTime() < eventStart
                || treatmentStart.getTime() > eventEnd && treatmentEnd.getTime() > eventEnd
                ) {
                    continue

                } else {
                    availableTimes.splice(t, 1)
                    t--
                }
        }
    };

    console.log(availableTimes)
    const availableTimeSlots = lockedTimeSlots.length > 0 ? availableTimes.filter(e => {
        /* If the strict equal comparison is true, Every will return true. 
        Once it finds an element that doesn't meet the test function, it will return False and stop. */
        console.log(lockedTimeSlots.every((l) => {
            console.log(new Date(e).getTime(), parseInt(l))
            return new Date(e).getTime() !== parseInt(l)


        }))
         return lockedTimeSlots.every((l) => (new Date(e).getTime() !== parseInt(l)));
    }) : availableTimes;
    
    // Some Method
    console.log(availableTimeSlots)
    return availableTimeSlots;
}

// calculateTime()

