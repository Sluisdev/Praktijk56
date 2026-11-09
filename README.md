# About This Project

Praktijk 56 is a starting massage practice. The owner will soon open her practice. 
She would like a website with a calm & modern appearance, and most importantly, the website must contain a booking system.

# The Technical Side
This website is currently under development. Most of the front-end and back-end work is done. The current focus is on finalizing the booking system. This system has been built entirely from scratch, without the use of NPM packages or external (CDN) scripts. It retrieves availability information via the Google Calendar API. Based on the data returned, available time slots are presented to the client. The owner can manage her calendar directly through Google, and all updates are synchronized with the back-end.

The Front-end for the Booking App is build with React. The React files can be located via /public/build

How the booking process works:

1. The client selects a treatment.
2. Based on the duration of the treatment, the chosen date, and availability, a number of time slots are presented.
3. After selecting the desired date and time, the client must provide their contact details.
4. The next step displays an overview of all booking details, where the client can also confirm the booking.
5. A success page is shown, featuring the booking reference number.

### Key Points
* Worked with a Graphical Designer to create the design and rebuild it with CSS
* Manually written shapes with clip-path
* Integration with GoogleAPI
* Booking App build with React

### Improvement points
* Semantic HTML
* Overall Responsiveness
