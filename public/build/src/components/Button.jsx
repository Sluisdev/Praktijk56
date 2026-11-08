import ValidationMessage from "./ValidationMessage"

export default function Button ({children, handleClick, type = "button", className, disabled = false}) {

    return (
    <button 
        onClick={ handleClick ? handleClick : null} 
        type={type}
        className={"button" + " " + className}
        disabled={disabled}
    >
        {children}
    </button>)
}