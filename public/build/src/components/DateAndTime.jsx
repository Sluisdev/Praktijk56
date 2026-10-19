import Calendar from 'react-calendar'
import {useState, useEffect} from 'react'
import TimeSlots from './Timeslot'
import axios from 'axios'
import 'react-calendar/dist/Calendar.css';
import '../custom-calendar-styles.css'

function tileDisabledCallback(date, view ) {
        if (view === "month") {
            return date.getDay() === 0 || date.getDay() === 6
        }
        return false
}

export default function DateAndTime ({apiData, bookingDetails}) {
    const [timeSlots, setTimeSlots] = useState(apiData)
    const [isLoading, setIsLoading] = useState(false)
return (
    <section className='calendarContainer'>
        <Calendar 
            minDate={new Date} 
            tileDisabled={({activeStartDate ,date, view}) => {return tileDisabledCallback(date, view)}}
            defaultValue={bookingDetails.date} 
            onChange={(value, event) => {
                value.setHours(value.getHours() + (value.getTimezoneOffset() / 60 * -1)) 
                const date = value.toISOString()
                setIsLoading(true)
                axios.get(`http://localhost:3000/availability?date=${date}&product=${bookingDetails.productId}`)
                .then(e => {setTimeSlots(e.data);}).then(() => {setIsLoading(false)});
            }}
            // when different date is selected, use this to call /availability endpoint
            // the data returned needs to be passed to the TimeSlot component
            // This component needs to be re-rendered to contain the new data
        />
    {isLoading ? <p>loading timeslots...</p> :  
    <TimeSlots 
        initTimeSlots={timeSlots} 
        bookingDetails={bookingDetails} 
    />  }
    </section>
    
)

/* 
    Plan: 

    1. Default value needs to be set. This same value will be used to calculate "todays" available timeslot
        * Where is this initial value going to live? 
        * Preferrably the times based in the default value are delivered via the Props apiData. 
        * This means the initial value will need to live at the Parent
    2. Load Time component and pass array with available times. 
        * can conditionally load a message if no times are available. 
        * pass setBookingDetails to Time component to 



*/
    
}