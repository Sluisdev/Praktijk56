 import Section from "./section"
 import Button from "./Button"
 
 export default function StepButtons ({onBack, onNext, componentId, stepIndex}) {
        const isSuccessPage = componentId === "Overview"
        return (<Section>
            {isSuccessPage ?  (
                <Button 
                    className={"submit"}
                    type={"submit"}
                    >
                    Boeking Bevestigen
                </Button>
            ) : (
                <>
                    <Button 
                        handleClick={onBack}
                        className={"backBtn"} 
                        disabled={stepIndex === 0} 
                        >
                        Terug
                    </Button> 
                    <Button 
                        handleClick={onNext}
                        className={"nextBtn"}
                        >
                        Volgende
                    </Button> 
                </>
            )}
        </Section>)
    };