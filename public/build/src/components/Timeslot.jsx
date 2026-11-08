import Buttons from "./Button"
import {useState} from 'react'

export default function TimeSlots ({timeSlots, bookingDetails}) {
    const [selectedTime, setSelectedTime] = useState()
    return (
        <section className="timeSlotContainer">
            {timeSlots.map((t, i) => {
                const timeSlot = new Date(t)
                const isSelected = timeSlot.getTime() === new Date(selectedTime).getTime();
               return <input 
                        type="button" 
                        className={isSelected ? "button highlight" : "button"}
                        onClick={() => {bookingDetails.date = timeSlot; setSelectedTime(timeSlot); console.log(bookingDetails)}}
                        value={`${timeSlot.getUTCHours()}:${timeSlot.getMinutes() === 0 ? "00" : timeSlot.getMinutes()}`}/> 
            })}
        </section>
    )
}