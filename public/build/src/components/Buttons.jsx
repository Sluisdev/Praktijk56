export default function Buttons ({number, buttonEventHandler, currentStep, treatments}) {

// changes the state of the value saved under 'bookingStep' (useState) in the Parent Component

const changeBookingStep = (buttonType) => { // NOTE: maybe parts of this function need to be defined on the Parent?
    const stepNr = treatments.indexOf(currentStep)
    // Depending on the value given to 'buttonType'(see button id attributes) it's determined whether it's a step forward or back.
    if (buttonType === "nextBtn") {
        buttonEventHandler(treatments[stepNr + 1])
    } else if (buttonType === "backBtn" && stepNr > 0) {
        buttonEventHandler(treatments[stepNr - 1])
    }
}
// function to generate a number of buttons and assign them values based on the integer in the 'number' Prop
const generateButtons = () => {
    const array = number < 2 ? new Array("nextBtn") : new Array("nextBtn", "backBtn")
    const buttons = array.map((e, i) => {
        return <button 
            className="button" 
            onClick={() => changeBookingStep(e)} 
            key={i} id={e}
            >
                {e === "nextBtn" ? "Volgende" : "Ga terug"}
            </button>
    }); 
    return buttons 
}

    return (
        <section className="buttonsContainer"> 
            {generateButtons()}
        </section>
    )
}