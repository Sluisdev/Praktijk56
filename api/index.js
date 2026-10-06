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
const Events = require('../public/js/models/events')
const UpdateMessages = require('../public/js/models/UpdateMessages')
const path = require('path')
const jwt = require('jsonwebtoken')
let lockedTimeSlots = []
const cors = require('cors')



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
 
// forwardToApp();

mongoose.connect(process.env.DATABASE_URL)
.then(() => {
    console.log("CONNECTED TO LOCAL DATABASE")
})
.catch((e) => {
    console.log('database URL', process.env.DATABASE_URL)
    console.log("Error occurred:", e)
})

app.use(express.urlencoded({extended: true}));
app.use(express.json())
app.use(cors())
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
    try {
        const token = await GoogleTokens.find()
        if (token.length > 0) {
            console.log("Token event")
            const id = token[0][_id]
            if (t.refresh_token) {
                console.log('New refresh token logged!', t.refresh_token)
                await GoogleTokens.findByIdAndUpdate(id, {refreshToken: t.refresh_token, date: Date.now()});
                console.log('google tokens updated')
            }   
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

const calendar = google.calendar({version: 'v3', auth: oauth2Client});

const gmail = google.gmail({version: "v1", auth: oauth2Client})

app.get('/auth', (req, res) => {
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/gmail.send'],
        include_granted_scopes: true
    })
    res.redirect(authorizationUrl)

})

app.get('/oauth2callback',  async (req, res) => {
    const authCode = req.query
    try {
    let {tokens} = await oauth2Client.getToken(authCode)
    console.log(tokens)
    await new GoogleTokens({
        refreshToken: tokens.refresh_token, 
        accessToken: tokens.access_token
    }).save()
    oauth2Client.setCredentials(tokens)
    // const watch = await calendar.events.watch({
    //     calendarId: await calendarId(), 
    //     requestBody: {
    //         id: 19, 
    //         type:'webhook', 
    //         address:'https://naturist-sensitize-malt.ngrok-free.dev/update' 
    //     }

    // })
    // console.log(watch)
    const {data} = await calendar.events.list({calendarId: await calendarId()})
    // This filters out all events before the init date & then use map to return an array with a custom Object
    const allEvents = data.items.filter((e) => {
        console.log('inside filter method', e)
        const startDate = new Date(e.start.dateTime)
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        console.log(startDate, today)
        if (e.recurrence || startDate.getTime() > today.getTime()) {
            return true
        } else {
            return false
        }
    }).map(e => {
        console.log('Events on initialization', e)
        return {
            eventId: e.id, 
            etag: e.etag, 
            start: e.start.dateTime, 
            end: e.end.dateTime, 
            status: e.status,
            recurring: e.recurrence ? true : false,
            updated: Date.now()
        }
    });
    console.log(allEvents)
    await Events.insertMany(allEvents)
    // I want to filter out all events with a date in the past
    await new SyncToken({token: data.nextSyncToken, updated: Date.now()}).save()
    res.send('everything initialized!')
    } catch (e) {
        console.log('error on initialization', e)
    }
    
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
    if (id) {
        const product = await Product.findById(id)
    product.name ? res.send(product.name).status(200) : res.send('product was not found').status(500)
    } else {
        const allProducts = await Product.find()
        res.send(allProducts)
    }
    
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
            description: "testing placing a booking", 
            extendedProperties: {
                private: {
                    productId: productId,
                    name: fullName, 
                    phoneNumber: phoneNumber, 
                    emailAddress: emailAddress,
                    toc: toc 
                }
            }
        }
        
    })
    console.log("new event", newAppointment)
    await new Events({
            eventId: newAppointment.data.id, 
            etag: newAppointment.data.etag, 
            start: newAppointment.data.start.dateTime, 
            end: newAppointment.data.end.dateTime, 
            status: newAppointment.data.status,
            recurring: newAppointment.data.recurrence ? true : false,
            productId: productId,
            customerDetails: {
                name: fullName, 
                phoneNumber: phoneNumber, 
                emailAddress: emailAddress, 
                toc: toc
            },
            updated: Date.now()
    }).save()
     /* Send a confirmation email to the customer. This email should contain a link to cancel/modify the booking. */
    sendMessage(
        "new", 
        {
            eventId: newAppointment.data.id,
            name:fullName, 
            date: date, product: product.name, 
            duration: product.duration
        }, 
        emailAddress
    )
    
    } catch (e) {
        console.log('no booking placed, error:', e)
    }
    
  
    res.render('boekingVoltooid')
})

app.get('/testReact', (req, res) => {
    res.sendFile(path.join(__dirname, "../public/build/dist/index.html"))
    // During development of the React app, use npm run dev to start up the React app
    // When the React app is finished, use npm run build to process all the JSX and turn it into normal JS/CSS/HTML files
    // These can statically be served by Express. !keep in mind that all the paths will need to be adjusted when serving static files through Express. 
})

/* 
        - SYNC FUNCTION OVERVIEW - 
https://developers.google.com/workspace/calendar/api/guides/sync

1. Do a full initial sync. This can be done upon authenticating the Calendar access (see /oauth2callback)
2. Save the nextSynToken - V
3. Setup a WATCH route for the evens of a specific calendar - V
4. When the WATCH route is triggered, use the nextSyncToken to pull the added or updated events (see /update)- V
5. Validate whether event already exist. If yes, validate what changed, if not, save to the database. 
    * Need to check whether something is a recurring event. If yes, filter out - V
    * If document already exist, validate what changed. Based on the change, send an Appointment update to the customer - V
    * If document doesn't exist, create new document in the database - V

To remove current 0Auth2 client permissions: https://myaccount.google.com/permissions 

*/

app.post('/update', async (req, res) => {
    console.log('update received:', req.headers)
    const syncToken = await SyncToken.find()
    console.log(syncToken)
    const id = syncToken[0]._id
    const token = syncToken[0].token
    const newChanges = await calendar.events.list({syncToken: token, calendarId: await calendarId()})
    console.log(newChanges.data.items[0])
    try {
        if (newChanges.data.items.length >= 1) {
            /* 
            1. if newChanges contains changed event items, the map function will run. 
            2. the map function will map all required details to the same property names as saved to the database
            3. then a forEach is chained.
            4. if the existingEvent is an empty array, which means no event found, the event will be saved as a new event
            5. If the existingEvent isn't empty, we'll loop through the element (it's an object) with a for-in loop
               to access the property names and use these property names to compare both Objects
                1. in the first condition we check if the values on both Objects are the same   
                2. second condition we check if the property/value is true or if the key = updated
                3. if the else statement is reached, the changed value is added to the corresponding key on the Object saved to updatedEvent
            6. based on the change, a function will be called and this function will receive data to sent out an email. 
            */
           const filteredEvents = []
           for(let e of newChanges.data.items) {
            if (e.status === 'cancelled') {
                    const event = await Events.findOne({eventId: e.id})
                    const emailAddress = event.customerDetails.emailAddress
                    // Doesn't send cancel messages anymore, need to check
                    console.log(event)
                    if (event && emailAddress.length > 0) {
                        sendMessage('cancelled', {}, event.customerDetails.emailAddress)
                    }
                    await Events.findByIdAndDelete(event._id)
                    console.log("/update: event removed and confirmation sent out")
                    continue
                } else {
                    filteredEvents.push(e)
                }
            }
            filteredEvents.map(e => {
            console.log("event that's passed to map:", e)
            return  {
                    eventId: e.id, 
                    etag: e.etag, 
                    start: e.start.dateTime, 
                    end: e.end.dateTime, 
                    status: e.status,
                    recurring: e.recurrence ? true : false,
                    productId: e.extendedProperties ? e.extendedProperties.private.productId : "",
                    customerDetails: {
                        name: e.extendedProperties ? e.extendedProperties.private.name : "",
                        phoneNumber: e.extendedProperties ? e.extendedProperties.private.phoneNumber : "", 
                        emailAddress: e.extendedProperties ? e.extendedProperties.private.emailAddress : "",
                        toc: e.extendedProperties ? e.extendedProperties.private.toc : ""
                    },
                    updated: Date.now()
                };
            
            }).forEach(async e => {
                console.log("event passed to forEach:", e)
                const existingEvent = await Events.find({eventId: e.eventId})
                if (existingEvent.length >= 1) {
                    console.log("found existing event:", existingEvent)
                    const updatedEvent = existingEvent[0].toObject() // turning this into an Object to remove any pre-defined mongoose objects
                      console.log('updated event before manipulation:', updatedEvent) 
                    updatedEvent.updated = Date.now()
                    let eventUpdated = false
                    console.log("Event found!")
                    for(let key in e) {
                        if (updatedEvent[key] === e[key]) {
                            console.log("no changes found")
                            continue
                        } else if (key === 'updated' ){
                            continue
                        } else if (!updatedEvent[key] || updatedEvent[key].length <= 0) {
                            console.log("key doesn't exist or doesn't hold an value")
                            continue
                        } else if (key === "customerDetails") {
                                for(let prop in e.customerDetails) {
                                if (updatedEvent.customerDetails[prop] === e.customerDetails[prop] ) {
                                    continue
                                    console.log("found no change in customerDetails")
                                } else {
                                    updatedEvent.customerDetails[prop] = e.customerDetails[prop]
                                    eventUpdated = true
                                    console.log("found  change in customerDetails:", updatedEvent.customerDetails[prop], e.customerDetails[prop] )
                                } 
                            }
                        } else if (key !== 'customerDetails') {
                            console.log("found changes")
                            console.log(`key: ${key}, updatedEvent[key]: ${updatedEvent[key]}, e[key]: ${e[key]}`)
                            console.log('non-updated event',existingEvent)
                            updatedEvent[key] = e[key]
                            eventUpdated = true
                            console.log('updated event', updatedEvent)
                            
                        }
                    }
                    if (eventUpdated) {
                        await Events.findByIdAndUpdate(updatedEvent._id, {updatedEvent})
                        const product = await Product.findById(updatedEvent.productId)
                        sendMessage('update', {
                            eventId: updatedEvent.eventID,
                            name: updatedEvent.customerDetails.name,
                            date: updatedEvent.start, 
                            product: product.name, 
                            duration: product.duration
                        }, updatedEvent.customerDetails.emailAddress)
                        console.log("/update: event updated and confirmation sent out to the customer")
                        
                    }
                } else {
                    new Events(e).save()
                    console.log("/update: event didn't exist yet, new event saved")
                    // No booking confirmation will be send as new customer events are not expected through this route 
                }
            })
        }
    } catch (e) {
        console.log('error on update route:', e)
    }
    await SyncToken.findByIdAndUpdate(id, {token: newChanges.data.nextSyncToken, updated: Date.now()})

})

// Data parameter expects following properties: name, date, product(name), (product)duration.}
async function sendMessage (status, data, email) {
    const statusMessage =  await UpdateMessages.find({status: status})
    const body = bodyContent(status, statusMessage[0], data)
    const emailLines = [
        `To: ${email}`,
        `Subject: ${statusMessage[0].title}`, 
        "Content-type: text/html; charset='UTF-8'",
        "MIME-Version: 1.0",
        "",
        body
    ];
    const rawEmailString = emailLines.join('\r\n')
    const base64URLEncoding = Buffer.from(rawEmailString).toString('base64url')
    try {
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {raw: base64URLEncoding}
        })
    } catch (e) {
        console.log('error sending email:', e)
    }
}

function bodyContent (status, messageDetails, data) {
    if (status === 'cancelled') {
        const body = 
        `<!DOCTYPE html>
        <html lang="en">
            <body>
                <H2>Beste Klant,</H2>
                <P>${messageDetails.message.body}</P>
                <p style="font-style: italic;">Mocht u een nieuwe boeking willen plannen, dit kan via onze website: <a href="http://local:3000/booking">Maak een afspraak</a></p>
            </body>
        </html>`
        return body.trim()
    } else {
        const mins = new Date(data.date).getMinutes().toString()
        const hours = new Date(data.date).getHours()
        const token = createToken(data.eventId, data.date)
        console.log(mins.length, mins)
        const body = 
        `<!DOCTYPE html>
        <html lang="en">
        <body>
            <H2>Beste Klant,</H2>
            <P style="text-wrap-style: pretty;">${messageDetails.message.body}</P>
            <section>
                <h3>Boeking Gegevens</h3>
                <ul>
                    <li>Datum: ${new Intl.DateTimeFormat("nl-NL").format(new Date(data.date))}</li>
                    <li>Start tijd: ${hours}:${mins.length > 1 ? mins : `0${mins}`}</li>
                    <li>Geboekte behandeling: ${data.product}</li>
                    <li>Duur: ${data.duration} minuten</li>
                </ul>
            </section>
            <p style="font-style: italic;">Klopt er iets niet? <a href="http://localhost:3000/booking/aanpassen?t=${token}">pas hier uw boeking aan</a></p>
        </body>
        </html>`
        return body.trim()
    }
    
}

function createToken (eventId, date) {
    console.log(process.env.JWT_SECRET)
    const dateObj = new Date(date)
    const expr = (dateObj.getTime() - Date.now()) / 60
    const token = jwt.sign({eventId: eventId}, process.env.JWT_SECRET, {expiresIn: expr.toString() })
    return token
}

// app.post('/addMessages', async (req, res) => { 
//     const messageData = req.body
//     messageData.updated = Date.now()
//     console.log(messageData)
//     await new UpdateMessages(messageData).save()
//     res.send("message added").status(200)
// })


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


// calculateTime()

