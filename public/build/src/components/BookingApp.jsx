import Button from "./Button"
import axios from 'axios'
import {useState, useEffect, lazy, Suspense, useRef} from 'react' 
import {useForm} from 'react-hook-form'
import { bookingComponents } from "../data/ComponentArray"
import Section from "./section"
import StepButtons from "./StepButtons"

// Flow: Treatment > Date + Time (timeslots are triggered by selected date > Fill out contact details > Overview of Booking Details > Success page

function intialDateValue () {
    const date  = new Date()
    date.setDate(9)
    // date.setHours(date.getHours() + (date.getTimezoneOffset() / 60 * -1))
    return date.toISOString()
}


export default function BookingAppContainer () {
    const [stepIndex, setStepIndex] = useState(0);
    const { Component, id: componentId, initDataCallURL, validation} = bookingComponents[stepIndex];
    const [isLoading, setIsLoading] = useState(false); // To counter a re-render when the initial data is being reloaded
    const [apiData, setApiData] = useState([]);
    const [formError, setFormError] = useState(null) 
    const {current: bookingDetails} = useRef({
        productId: "", 
        date: intialDateValue(),
        contactDetails: {
            firstName: {label: "voornaam", data: ""},
            lastName: {label: "Achternaam", data: ""}, 
            phoneNumber: {label: "Telefoonnummer", data: ""}, 
            emailAddress: {label: "Email Adres", data: ""},
            toc: {label: "Ik accepteer de algemene voorwaarden", data: ""}, 
        }
    });
    // const [bkDetails, setBkDetails] = useState({
    //     productId: "", 
    //     date: {initValue: intialDateValue(), choice: ""},
    //     contactDetails: {
    //         firstName: {label: "voornaam", data: ""},
    //         lastName: {label: "Achternaam", data: ""}, 
    //         phoneNumber: {label: "Telefoonnummer", data: ""}, 
    //         emailAddress: {label: "Email Adres", data: ""},
    //         toc: {label: "Ik accepteer de algemene voorwaarden", data: ""}, 
    //     }
    // })
    function nextStep () {
        const {propertyName, error} = validation
        if (bkDetails[propertyName].length === 0) {
            setFormError(error)
            return
        }
        setStepIndex(stepIndex + 1)
    }
     useEffect(() => { 
        if (!initDataCallURL) return
        let getURL;
        if (componentId === "DateAndTime") {
            getURL = `${initDataCallURL}?date=${bookingDetails.date}&product=${bookingDetails.productId}`
        } else {
            getURL = initDataCallURL
        }
        setIsLoading(true) // Setting this to true will ensure the Component and it's child Components aren't displayed until the data is loaded.
        axios.get(getURL).then(({data}) => {
            setApiData(() => (data)) // queues a re-render
            setIsLoading(false)
            console.log(data)
        }).catch((e) => {console.log("Error on GET call:", e)}) // need to show error when GET call fails
    }, [stepIndex]); // Doesn't get re-executed unless stepIndex changes

   
    return (
    <form className="bookingAppContainer" >
        <h1>{componentId !== "SuccessPage" && "Maak een Afspraak"}</h1> 
        <Suspense> 
            <h2>{bookingComponents[stepIndex].header}</h2>
            {isLoading ? "Is Loading..." : <Component apiData={apiData} bookingDetails={bookingDetails}/> } 
        </Suspense>
        <StepButtons
            stepIndex={stepIndex}
            onNext={nextStep}
            onBack={() => setStepIndex(stepIndex - 1)}
            componentId={componentId}
        />
        {/* // As test for the validation. Need to create a reusable Component that displays the error.  */}
        {formError && <p>{formError}</p>} 
    </form>
    
    );
}