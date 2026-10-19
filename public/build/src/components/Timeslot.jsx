import Buttons from "./Buttons"
import {useState} from 'react'

export default function TimeSlots ({initTimeSlots, bookingDetails}) {
    const [selectedTime, setSelectedTime] = useState()
    return (
        <section className="timeSlotContainer">
            {initTimeSlots.map((t, i) => {
                const timeSlot = new Date(t)
                const isSelected = timeSlot.getTime() === new Date(selectedTime).getTime();
               return <button className={isSelected ? "button highlight" : "button"} onClick={() => {bookingDetails.date = timeSlot; setSelectedTime(timeSlot); console.log(bookingDetails)}}>
                        {timeSlot.getUTCHours()}:{timeSlot.getMinutes() === 0 ? "00" : timeSlot.getMinutes()}
                </button>
                
            })}
        </section>
    )
}