export default function ContactDetails ({bookingDetails}) {
    return ( 
      <section>
        {/* normal for-in loops are statements and React expects an expression. Using Object.entries in combi with map is an expression */}
        <label htmlFor="firstName">Voornaam</label>
        <input type="text" id="firstName" name="firstName" required onChange={(e) => {bookingDetails.onChange(e.target.getAttribute("name"), e.target.value)}}/>
        <label htmlFor="lastName" >Achternaam</label>
        <input type="text" id="lastName" name="lastName" required onChange={(e) => {bookingDetails.onChange(e.target.getAttribute("name"), e.target.value)}} />
        <label htmlFor="phoneNumber">Telefoonnummer</label>
        <input type="text" id="phoneNumber" name="phoneNumber" required onChange={(e) => {bookingDetails.onChange(e.target.getAttribute("name"), e.target.value)}}/>
        <label htmlFor="emailAddress">Email Adres</label>
        <input type="text" id="emailAddress" name="emailAddress" required onChange={(e) => {bookingDetails.onChange(e.target.getAttribute("name"), e.target.value)}}/>
        <label htmlFor="toc">ik accepteer de algemene voorwaarden</label>
        <input type="checkbox" id="toc" name="toc" required onChange={(e) => {bookingDetails.onChange(e.target.getAttribute("name"), "true")}}/>
      </section>
    )

    // onChange={(e) => {bookingDetails.onChange("lastName", e.target.value); console.log(e.target)}}
}