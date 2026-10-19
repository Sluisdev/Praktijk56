
/* Treatments will be an list with all available treatments
    1. Box needs to be scrollable
    2. Every Treatment Item should contain the duration and the treatment information
    3. When treatment is selected, highlight choice
    4. When treatment is selected, update array in Parent

*/

import {useState} from 'react'


export default function Treatments ({apiData, bookingDetails}) {

// function selectedTreatment (productId) {
//     setBookingDetails((curr) => {
//         return {...curr, productId: productId }
//     })
// }
    const [selectedElememt, setSelectedElement] = useState()
    return (
        <section className="treatmentListContainer">
            {apiData.map(e => {
                const checkId = e._id === selectedElememt
                return (
                <section 
                    className={checkId ? "treatmentItem highlight" : "treatmentItem"} 
                    key={e.productId} 
                    onClick={() => {bookingDetails.productId = e._id; setSelectedElement(e._id)}}
                    >
                    <hgroup className="headersTreatmentItem">
                        <h3 id="treatmentName">{e.name}</h3>
                    </hgroup>
                    <p>{e.description}</p>
                    <ul className="treatmentListDetails">
                        <li>Duur: {e.duration} minuten</li>
                        <li>Prijs: </li>
                    </ul>
                </section>)
            })}
        </section>
    )
}