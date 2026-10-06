import Treatments from "./Treatments"
import Buttons from "./Buttons"
import DateAndTime from "./DateAndTime"
import ContactDetails from "./ContactDetails"
import Overview from "./Overview"
import SuccessPage from "./SuccessPage"
import axios from 'axios'
import {useState, useEffect} from 'react' 

// Flow: Treatment > Date + Time (timeslots are triggered by selected date > Fill out contact details > Overview of Booking Details > Success page

const bookingComponents = {
        treatments: <Treatments />, 
        dateAndTime: <DateAndTime />, 
        contactDetails: <ContactDetails />, 
        overview: <Overview />, 
        successPage: <SuccessPage />
    }

const treatmentsOrdered = ['treatments', 'dateAndTime', "contactDetails", "overview", "successPage"]

export default function BookingAppContainer () {
    const [bookingStep, setBookingStep] = useState("treatments")
    const [getUrl, setGetUrl] = useState("http://localhost:3000/product")
    const [apiData, setApiData] = useState([])
    const changeBookingStep = (bookingStep) => {
        setBookingStep(bookingStep)
    }
    useEffect(() => {
        axios.get(getUrl).then(({data}) => {
            setApiData(data)
        }).catch((e) => {console.log("Error on GET call:", e)})
    }, [getUrl])
        return (
        <section className="bookingAppContainer">
            <h1>Maak een Afspraak</h1> 
            {bookingComponents[bookingStep]}
            {bookingStep !== "successPage" && 
                <Buttons 
                    number={bookingStep === "treatments" ? 1 : 2} // potentially this doesn't need to passed down anymore due to currentStep & treatments
                    buttonEventHandler={changeBookingStep} 
                    currentStep={bookingStep}
                    treatments={treatmentsOrdered}
                />
            }
            <p>current Booking Step: {bookingStep}</p>
        
        </section>
        
    )
}