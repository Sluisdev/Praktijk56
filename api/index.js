const express = require('express')
const {google} = require('googleapis')
const bodyParser = require('body-parser')
const dotenv = require('dotenv').config()
const axios = require('axios')
const app = express()
const mongoose = require('mongoose')
const Product = require('../public/js/models/products')
const GoogleTokens = require('../public/js/models/gtokens')
const SyncToken = require('../public/js/models/synctoken')
const path = require('path')
let lockedTimeSlots = []

// Ngrok for making my locally hosted app public.

const ngrok = require("@ngrok/ngrok");
 
async function forwardToApp() {
	const forwarder = await ngrok.forward({
		addr: "localhost:3000",
		authtoken_from_env: true,
		domain: "naturist-sensitize-malt.ngrok-free.dev",
	});
	console.log(`Available at: ${forwarder.url()}`);
}
 
forwardToApp();

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
        await GoogleTokens.findByIdAndUpdate(id, {refreshToken: t.refresh_token, date: Date.now()});
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
    try {
    let {tokens} = await oauth2Client.getToken(authCode)
    await new GoogleTokens({
        refreshToken: tokens.refresh_token, 
        accessToken: tokens.access_token
    }).save()
    oauth2Client.setCredentials(tokens)
    const watch = await calendar.events.watch({
        calendarId: await calendarId(), 
        requestBody: {
            id: 19, 
            type:'webhook', 
            address:'https://naturist-sensitize-malt.ngrok-free.dev/update' 
        }

    })
    console.log(watch)
    const {data} = await calendar.events.list({calendarId: await calendarId()})
    await new SyncToken({token: data.nextSyncToken, updated: Date.now()}).save()
    res.send('everything initialized!')
    } catch (e) {
        console.log('error on initialization', e)
    }
    
    /* upon initialization, pull a list of all events. These will be saved to the database.
        1. filter all events that are before the data of initialization with the exception of recurring events
        2. Save the following properties:
        - recurring: true or false 
        - ObjectId: needs to be ID of event resource
        - etag from event resource (versioning)
        - start
        - end
        - productId
        - status
        - updated

    */
})


app.get('/calendar', async (req, res) => {
    const calendarList = await calendar.calendarList.list()
    const bookingsCalendar = calendarList.data.items.filter((f) => {
        return f.summary == 'Test Praktijk 56'
    }).map((m) => {
        return m.id
    });
    const events = await calendar.events.list({calendarId: bookingsCalendar[0]})
    console.log(calendarList.data)
    res.send('events received!!')
   
})

app.post('/timeslot', (req, res) => {
    console.log('request received', req.query)
    const {timeslot, remove} = req.body
    const time = new Date(timeslot).getTime()
    console.log(typeof(timeslot), timeslot, typeof(remove), remove)
    if (remove) {
        const index = lockedTimeSlots.indexOf(time)
        lockedTimeSlots.splice(index, 1)
    } else {
        lockedTimeSlots.push(new Date(timeslot).getTime())
    }
    
    res.send('call received').status(200)
})

app.get('/availability', async (req, res) => {
    const {date, product} = req.query
    const {duration: trDuration} = await Product.findById(product)
    const selectedDate = new Date(date)
    /* Time provided is in local timezone ( GMT +2 in summer), hence increasing by 2 to work with UTC time. 
    Will need to address this programmatically to prevent any future issues */
        selectedDate.setHours(selectedDate.getHours() + 2)
    const nextDay = new Date(date); 
    nextDay.setDate(nextDay.getDate() + 1)
    try {
        const calendarList = await calendar.calendarList.list();
        const events = await calendar.events.list({
            calendarId: await calendarId(), 
            timeMin: selectedDate, 
            timeMax: nextDay,
        });
        console.log(events.data.items)
        console.log(events)
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
        const availableTimeSlots = calculateTime(scheduledEventTimes, selectedDate, trDuration)
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

app.post('/booked', async (req, res) => {
    console.log("received booking details:", req.body)
    const {
        fullName, date, 
        productId, phoneNumber, 
        emailAddress, toc
    } = req.body;
    console.log(productId)
    const product = await Product.findById(productId)
    const trEndTime = calcEndTime(date ,product.duration)
    console.log(trEndTime)
    try {
        const newAppointment = await calendar.events.insert({
        calendarId: await calendarId(),
        requestBody: {
            summary: `Boeking - ${fullName} | ${product.name}`,
            start: {
                dateTime: date,
                timezone: 'Europe/Amsterdam'
            },
            end: {
                dateTime: trEndTime,
                timezone: 'Europe/Amsterdam'
            },
            description: "testing placing a booking"
        }
    })
    console.log(newAppointment)
    
    } catch (e) {
        console.log('no booking placed, error:', e)
    }
    
    

    // Got the booking data from req.body - V
    // Fetch duration of treatment to determine the end of the appointment - V
    // Setup a Watch Channel - V
    // Receive notification from Watch channel & fetch a list with the latest modifications - V
    /* When a new event is created, the /updated route will be triggered as there's a Watch channel setup. 
        When this route is triggered, the last saved 'nextSyncToken'is retrieved and is used to retrieve 
        a list with the latest modifications. 

        When the newest modifications are received, the idea is to use the ID of the event item, 
        to check if an event with this ID already exists. If yes, check what has changed, if not, save to the database. 

        Document properties I want to save:
        - ObjectId: needs to be ID of event resource
        - etag from event resource (versioning)
        - start
        - end
        - productId
        - status
    */
   /* Send a confirmation email to the customer. This email should contain a link to cancel the booking. */

    res.render('boekingVoltooid')
})

/* 
        - SYNC FUNCTION OVERVIEW - 
https://developers.google.com/workspace/calendar/api/guides/sync

1. Do a full initial sync. This can be done upon authenticating the Calendar access (see /oauth2callback)
2. Save the nextSynToken - V
3. Setup a WATCH route for the evens of a specific calendar - V
4. When the WATCH route is triggered, use the nextSyncToken to pull the added or updated events (see /update)- V
5. Validate whether event already exist. If yes, validate what changed, if not, save to the database. 
    * !Need to check whether something is a recurring event!
    * based on the validation part, a certain function will be triggered to send an email. 

To remove current 0Auth2 client permissions: https://myaccount.google.com/permissions 

*/

app.post('/update', async (req, res) => {
    console.log('update received:', req.headers)
    const syncToken = await SyncToken.find()
    console.log(syncToken)
    const id = syncToken[0]._id
    const token = syncToken[0].token
    const newChanges = await calendar.events.list({syncToken: token, calendarId: await calendarId()})
    await SyncToken.findByIdAndUpdate(id, {token: newChanges.data.nextSyncToken, updated: Date.now()})
    console.log('See changes:', newChanges.data)

})

app.post('/stopWatch', async (req, res) =>  {
    const {id, resourceId} = req.body
    try {
        await calendar.channels.stop({requestBody: {id: id, resourceId: resourceId}})
        res.send('stopped watching the specified channel!').status(204)

    } catch (e) {
        res.status(500)
        console.log('error', e)
    }
})

// Selected date always needs to be at 00:00 on that date. Otherwise certain times won't be returned. 

function calculateTime(events, selectedDate, trDuration) {
    console.log(events)
    let treatmentDurationMs = trDuration * 60 * 1000;
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
    console.log(availableTimes)
    const today = new Date();
        today.setHours(today.getHours() + 2);
    for (let i = 0; i < events.length; i++) {
        const eventStart = events[i].eventStart.getTime()
        const eventEnd = events[i].eventEnd.getTime()
                console.log(eventStart, eventEnd)

        for(let t = 0; t < availableTimes.length; t++) {
            const treatmentStart = new Date(availableTimes[t])
            const treatmentEnd = new Date(availableTimes[t])
            treatmentEnd.setTime( treatmentStart.getTime() + treatmentDurationMs)
            if ( treatmentStart.getTime() < today.getTime()) {
                    availableTimes.splice(t, 1)
                    t--
                } else if (treatmentStart.getTime() < eventStart && treatmentEnd.getTime() <= eventStart
                || treatmentStart.getTime() >= eventEnd && treatmentEnd.getTime() > eventEnd
                ) {
                    continue

                } else {
                    availableTimes.splice(t, 1)
                    t--
                }
        }
    };

    console.log("before filter", availableTimes)
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

function calcEndTime(trStart, trDuration) {
    const start = new Date(trStart)
    const durationMs = trDuration * 60 * 1000
    const trEndTime = new Date((start.getTime() + durationMs))
    return trEndTime.toISOString()
}

async function calendarId () {
    const calendarList = await calendar.calendarList.list();
    const calendarId = calendarList.data.items.filter((f) => {
                        return f.summary == 'Test Praktijk 56'
                        }).map((m) => {
                            return m.id
                        })
     return calendarId
}

async function getCalendarUpdates () { 

}

// calculateTime()

