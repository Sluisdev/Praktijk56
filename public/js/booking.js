const bookingForm = document.querySelector('.booking-form');
const bookingFormInnerHtml = bookingForm.innerHTML;
let selection = {};
initCalendar(document.querySelector('.calendar'));

function initCalendar (calendarElement) {
    datepicker(calendarElement, {
    customMonths: [
        "Januari",
        "Februari",
        "Maart",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Augustus",
        "September",
        "Oktober",
        "November",
        "December"
    ],
    customDays: ["Zo","Ma", "Di", "Wo", "Do", "Vr", "Za"], 
    minDate: new Date(),
    formatter: (input, date, instance) => {
    // This will display the date as `1/1/2019`.
    input.value = input.value = date.toLocaleDateString();
  },
  startDay: 1, 
  noWeekends: true, 
  onSelect: (instance, date) => { selection.date = date.toISOString()}
})
};


const loader = async () => {
    const loader = await axios.get('/loader')
    return loader.data
}

/* Because I'm updating the innerHtml of the booking form constantly, 
I'm making use of Event Delegation by attaching an Event Listener to a Parent element. 
This ensures that if e.target matches the defined CSS selector, 
the element is selected again based on the current Nodes, not the Nodes that existed previously */

bookingForm.addEventListener('click', async (e) => {
    console.log('click')
   if ( e.target.matches('.next-btn') ) {
        e.preventDefault()
        bookingForm.innerHTML = await loader()
        await finalizeBookingElements()
        contactDetails(document.querySelector('.booking-form'))
        console.log(e.target)
    }

    if (e.target.matches('.back-btn') || e.target.matches('.error-btn')) {
        e.preventDefault()
        selection = {}
        bookingForm.innerHTML = bookingFormInnerHtml
        initCalendar(document.querySelector('.calendar'));
    }

    if (e.target.matches('.book-btn')) {

    }

    // if ( e.target.matches('select[name=treatment]') ) {
    //     let product = document.querySelector('select[name=treatment]')
    //     product.addEventListener('change', changeProduct)
    // } 

    if (e.target.matches('#check-times') ) {
        e.preventDefault()
        checkAvailableTimes()
    }
    
    if(e.target.matches('.change-time-btn')) {
        e.preventDefault()
        unlockTimeSlot()
        checkAvailableTimes()
    }
})

bookingForm.addEventListener('change', (e) => {

    if ( e.target.matches('select[name=treatment]') ) {
        console.log()
        let product = document.querySelector('select[name=treatment]')
        changeProduct(e)
        
    }

    if (e.target.matches('input') && e.target.closest('.form-elements')) {
        console.log(e.target)
    }
    
    

})


function changeProduct (event) {
    if (selection.productId) {
       document.querySelector(`#product-${selection.productId}`).style.display = 'none'
    }
    const productId = event.target.selectedOptions[0].attributes[1].nodeValue
    const productInfo = document.querySelector(`#product-${productId}`)
    productInfo.style.display = 'flex'
    selection.productId = productId
}

async function checkAvailableTimes () {
    console.log(selection)
    try {
    // Turn this condition into a seperate function? Might be better to handle a number of different errors
    const error = document.querySelector('.error')
    if (!selection.date || !selection.productId) {
        error.classList.add('error-on')
        return
    } else if (error && error.classList.value.includes('error-on')) {
        document.querySelector('.error').classList.remove('error-on')
    }
    bookingForm.innerHTML = await loader()
    const {data: availableTimes} = await axios.get(`/availability?date=${selection.date}&product=${selection.productId}`)
    const timeSlotContainer = document.createElement('section')
    timeSlotContainer.classList.add('time-slot-container')
    console.log(availableTimes)
    for(t of availableTimes) {
        // Can this go in a seperate function?
        const input = document.createElement('input')
        const time = new Date(t)
        input.classList.add('time-slot')
        input.setAttribute('type', 'button')
        input.setAttribute('value', `${time.getUTCHours()}:${time.getUTCMinutes() == 0 ? '00' : time.getMinutes()}`)
        timeSlotContainer.appendChild(input);
    };
    document.querySelector('.dots-container').replaceWith(timeSlotContainer)
    } catch (e) {
        console.log("Error:", e)
    }
    const btnContainer = createEl('div', false, ['btn-container'])
    btnContainer.append(
        createEl('button', 'Vorige Stap', ['back-btn', 'btn']), 
        createEl('button', 'Volgende Stap', ['next-btn', 'btn']))
    bookingForm.append(btnContainer)
    selectedTimeSlot(document.querySelectorAll('.time-slot'))
}

async function finalizeBookingElements () {
    const appointOverview = createEl('section', false, ['appointment-overview'])
    const appointmentInfo = createEl('ul', false, ['appointment-info'])
    console.log(selection)
    for (prop in selection) {
        if (prop === 'productId') {
            const productName = await axios.get(`/product?id=${selection[prop]}`)
            appointmentInfo.appendChild(createEl('li', `Geselecteerde behandeling: ${productName.data}`, [`li-${prop}`], false))
            appointmentInfo.appendChild(createEl('input', false, false, 
                [
                    {attr: 'type', value:'hidden'}, 
                    {attr: 'value', value:selection[prop]}, 
                    {attr: 'name', value: prop}
                ]))
            continue
        } else if ( prop === 'date') {
            const date = new Date(selection[prop])
            appointmentInfo.append(
                createEl('li', `Geselecteerde Datum: ${new Intl.DateTimeFormat("nl-NL").format(date)}`, [`li-${prop}`], false),
                createEl('li', `Geselecteerde Tijd: ${date.getHours()}:${date.getMinutes.length == 1 ? date.getMinutes() : `0${date.getMinutes()}`}`, [`li-${prop}`], false),
                createEl('input', false, false, 
                [
                    {attr: 'type', value:'hidden'}, 
                    {attr: 'value', value:selection[prop]}, 
                    {attr: 'name', value: prop}
                ]))
            continue
        }
        appointmentInfo.appendChild(createEl('li', `${prop}: ${selection[prop]}`, [`li-${prop}`], false))
    }
    appointOverview.append(
        createEl('h1', 'Bevestig Afspraak', false), 
        createEl('h2', 'Afspraak Informatie'),
        appointmentInfo,
        createEl('h3', 'time: 10:00', ['timer'])
    )

    const formElements = createEl('section', false, ['form-elements'])
    await formElements.append(
        createEl('h3', 'Contact Gegevens'),
        createEl('label', 'Volledige Naam*', ['label'], [{attr: 'for', value: 'fullName'}]),
        createEl('input', false, ['full-name','input-booking'], [{attr: 'name', value: 'fullName'}, {attr: 'required', value: ''}]),
        createEl('label', 'Telefoonnummer*', ['label'], [{attr: 'for', value: 'phone-number'}]),
        createEl('input', false, ['phone-number', 'input-booking'], [{attr: 'name', value: 'phoneNumber'}, {attr: 'required', value: ''}]),
        createEl('label', 'Email Adres*', ['label'], [{attr: 'for', value: 'email-address'}]),
        createEl('input', false, ['email-address', 'input-booking'], [{attr: 'name', value: 'emailAddress'}, {attr: 'required', value: ''}]),
        createEl('label', 'Ik accepteer de algemene voorwaarden*', ['label','check-box'], [{attr: 'for', value: 'terms-of-conditions'}]),
        createEl('input', false, ['accepted-tfc'], [{attr: 'name', value: 'toc'}, {attr: 'type', value: 'checkbox'}, {attr: 'required', value: ''}, {attr: 'value', value: 'true' }])
    )
    const btnContainer = createEl('div', false, ['btn-container'])
    await btnContainer.append(
        createEl('button', 'Tijd Wijzigen', ['change-time-btn', 'btn']), 
        createEl('button', 'Boeking Bevestigen', ['confirm-booking-btn', 'btn']))
    bookingForm.innerHTML = ''
    await bookingForm.replaceChildren(appointOverview, formElements, btnContainer)
    lockTimeSlot()
    timer()
    console.log("function finished")
}

async function lockTimeSlot () {
    const timeSlot = new Date(selection.date)
    timeSlot.setHours(timeSlot.getHours() + 2)
    console.log(timeSlot)
    await axios.post('/timeslot', {timeslot: timeSlot, remove: false})
    return
}

async function unlockTimeSlot () {
    const timeSlot = new Date(selection.date)
    timeSlot.setHours(timeSlot.getHours() + 2)
    await axios.post('/timeslot', {timeslot: timeSlot, remove: true})
    return
}

function timer () {
    const timerElement = document.querySelector('.timer')
    let time = 10 * 60
    const countdown = setInterval(() => {
        if (time == 0) {
            unlockTimeSlot()
            clearInterval(countdown)
            error("De timer is verlopen. Klik op de knop hieronder om een nieuwe Boeking te maken ")
        } else {
            time--; 
            const minutes = Math.floor(time / 60)
            const seconds = time % 60
            timerElement.textContent = `time: ${minutes}:${String(seconds).length == 2 ? seconds : `0${seconds}`}`
        }
        
        
        
        }, 1000)
}

function contactDetails (element) {
    element.addEventListener('change', (e) => {
        console.log("change logged", e.target)
    })
}

function error (err) {
    bookingForm.replaceChildren(
        createEl('h1', 'Oh oh, er is iets misgegaan'), 
        createEl('p', err, ['error-message']), 
        createEl('button', 'Nieuwe Boeking', ['error-btn'])
    )
}

// cl and attr expect an array. el is mandatory

function createEl (el, text, cl, attr) {
   const element = document.createElement(el)
   if (text) element.textContent = text
   if (cl) cl.forEach(e => {element.classList.add(e)})
    if (attr) attr.forEach(e => element.setAttribute(e.attr, e.value))
   return element
}

function selectedTimeSlot (timeSlots) {
    if (timeSlots) {
        timeSlots.forEach((e) => {
        e.addEventListener('click', (ev) => {
            console.log(e.value)
            timeSlots.forEach(e => e.style.background = "")
            e.style.backgroundColor = "green"
            const timeAndDate = new Date(selection.date)
            timeAndDate.setHours(parseInt(e.value.slice(0, 2)))
            if (e.value.length === 4) {
                timeAndDate.setMinutes(parseInt(e.value.slice(2))) 
            } else {
                timeAndDate.setMinutes(parseInt(e.value.slice(3)))
            }
            console.log(timeAndDate)
            selection.date = timeAndDate.toISOString()
        })
    });
    }
    
}





