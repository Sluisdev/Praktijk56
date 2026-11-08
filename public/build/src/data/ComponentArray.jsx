
// Array with all Components corresponding to the step of the booking process

import {lazy} from 'react'

export const bookingComponents = [
        {   id: "Treatments",
            Component: lazy(() => import("../components/Treatments")), // Component is only retrieved when necessary with lazy importing.
            header: "Kies Uw Behandeling",
            initDataCallURL: "http://localhost:3000/product",
            validation: {
                propertyName: "productId", 
                error: "Selecteer een behandeling"
            }
  
        }, 
        {   id: "DateAndTime",
            Component: lazy(() => import("../components/DateAndTime")), 
            header: "Selecteer De Gewenste Datum En Tijd",
            initDataCallURL: "http://localhost:3000/availability", 
            validation: {
                propertyName: "date.choice", 
                error: "Selecteer een tijdslot"
            }

        }, 
        {
            id: "ContactDetails", 
            Component: lazy(() => import("../components/ContactDetails")), 
            header: "Contact Gegevens", 
            validation: {
                propertyName: "contactDetails", 
                error: "Niet alle gegevens zijn ingevuld"
            }

        }, 
        {
            id:"Overview", 
            Component: lazy(() => import("../components/Overview")), 
            header: "Verifïeer Uw Boekingsgegevens",
            validation: {
                error: "Niet alle velden zijn  ingevuld."
            }
        },
        {
            id: "SucessPage", 
            Component: lazy(() => import("../components/SuccessPage")), 
            header: "", 

        },  
]