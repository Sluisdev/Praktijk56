
/* Treatments will be an list with all available treatments
    1. Box needs to be scrollable
    2. Every Treatment Item should contain the duration and the treatment information
    3. When treatment is selected, highlight choice
    4. When treatment is selected, update array in Parent

*/

import Section from './section'

import {useState} from 'react'
import Button from './Button'


export default function Treatments ({apiData, bookingDetails}) {
    const [selectedElememt, setSelectedElement] = useState()
    const handleClick = (event, d) => {bookingDetails.productId = d._id; console.log(bookingDetails)}
    return (
        <Section className="treatmentListContainer">
            {apiData.map(d => {
                const checkId = d._id === selectedElememt
                console.log(checkId)
                return (
                <Button 
                    className={checkId ? "treatmentItem highlight" : "treatmentItem"} 
                    key={d.productId} 
                    handleClick={(e) => handleClick(e, d)}
                    type={"button"}
                    >
                    <hgroup className="headersTreatmentItem">
                        <h3 id="treatmentName">{d.name}</h3>
                    </hgroup>
                    <p>{d.description}</p>
                    <ul className="treatmentListDetails">
                        <li>Duur: {d.duration} minuten</li>
                        <li>Prijs: </li>
                    </ul>
                </Button>)
            })}
        {/* Need to display a error message when no product is selected & grey out button */}
        </Section>
    )
}