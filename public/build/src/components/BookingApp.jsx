import Buttons from "./Buttons"
import axios from 'axios'
import {useState, useEffect, lazy, Suspense, useRef} from 'react' 




// Flow: Treatment > Date + Time (timeslots are triggered by selected date > Fill out contact details > Overview of Booking Details > Success page
function intialDateValue () {
    const date  = new Date()
    date.setDate(19)
    // date.setHours(date.getHours() + (date.getTimezoneOffset() / 60 * -1))
    return date.toISOString()
}

const componentsOrdered = ['Treatments', 'DateAndTime', "ContactDetails", "Overview", "SuccessPage"]

const bookingComponents = {
        Treatments: {
            component:lazy(() => import("./Treatments")), 
            header: "Kies Uw Behandeling",
            initDataCallURL: "http://localhost:3000/product"  
        }, 
        DateAndTime: {
            component: lazy(() => import("./DateAndTime")), 
            header: "Selecteer De Gewenste Datum En Tijd",
            initDataCallURL: "http://localhost:3000/availability"
        }, 
        ContactDetails: {component: lazy(() => import("./ContactDetails")), header: "Contact Gegevens"}, 
        Overview: {component: lazy(() => import("./Overview")), header: "Verifïeer Uw Boekingsgegevens"}, 
        SuccessPage: {component: lazy(() => import("./SuccessPage")), header: ""},
        generateComponent(componentName, apiData, bookingDetails, isLoading) {
            console.log(apiData)
            const Component = this[componentName].component
                if (!isLoading) {
                    return <Component 
                    apiData={apiData} 
                    bookingDetails={bookingDetails}
                    />
                
                }
                
            }   
            
    }

// const bookingDetails = {
//         productId: "", 
//         date: intialDateValue(), 
//         fullName: "", 
//         phoneNumber: "", 
//         emailAddress: "", 
//         ToC: "", 
//         updateDetails(detail) {
//             const updatedDetails = {...this, ...detail}
//             this = updatedDetails
//         }
// }

export default function BookingAppContainer () {


    const [bookingStep, setBookingStep] = useState("Treatments")
    const [getUrl, setGetUrl] = useState("http://localhost:3000/product")
    const [isLoading, setIsLoading] = useState(false) // To counter a re-render when the initial data is being reloaded
    const [apiData, setApiData] = useState([])
    const bookingDetails = useRef({
        productId: "", 
        date: intialDateValue(), 
        fullName: "", 
        phoneNumber: "", 
        emailAddress: "", 
        ToC: "", 
    })

    // const [bookingDetails, setBookingDetails] = useState({
    //     productId: "", 
    //     date: intialDateValue(), 
    //     fullName: "", 
    //     phoneNumber: "", 
    //     emailAddress: "", 
    //     ToC: ""
    // })
    // const changeBookingDetails = (newData) => {setBookingDetails((curr) => ({...bookingDetails, ...newData}))}
    const changeBookingStep = (bookingStep) => {
        setBookingStep(bookingStep)
        setIsLoading(true)
        if (bookingStep === "DateAndTime") {
            console.log("Here", bookingStep, bookingComponents[bookingStep].initDataCallURL)
            const url = `${bookingComponents[bookingStep].initDataCallURL}?date=${bookingDetails.current.date}&product=${bookingDetails.current.productId}`
            setGetUrl(url)
            return
        }
        setGetUrl(bookingComponents[bookingStep].initDataCallURL)
    }
    useEffect(() => {
        axios.get(getUrl).then(({data}) => {
            setApiData(data)
            setIsLoading(false)
            console.log(apiData)
        }).catch((e) => {console.log("Error on GET call:", e)})
    }, [getUrl])
    console.log(getUrl ,"initial API data", apiData)
    
        return (
        <section className="bookingAppContainer">
            <h1>{bookingStep !== "SuccessPage" && "Maak een Afspraak"}</h1> 
            {bookingStep && (
                // Likely removing this Suspense component to create an
                <Suspense fallback="loading..."> 
                    <h2>{bookingComponents[bookingStep].header}</h2>
                    {bookingComponents.generateComponent(
                        bookingStep, 
                        apiData,
                        bookingDetails.current,
                        isLoading 
                        )}
                </Suspense>)}
            {bookingStep !== "SuccessPage" && 
                <Buttons 
                    number={bookingStep === "Treatments" ? 1 : 2} // potentially this doesn't need to passed down anymore due to currentStep & treatments
                    buttonEventHandler={changeBookingStep} 
                    currentStep={bookingStep}
                    componentNames={componentsOrdered}
                />
            }
        
        </section>
        
    )
}