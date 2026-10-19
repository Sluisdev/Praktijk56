import { useState } from 'react'
import 'react-calendar/dist/Calendar.css';
import './App.css'
import Header from './components/Header'
import Background from './components/Background'
import BookingApp from './components/BookingApp'
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';


function App() {
  
return (
  <>
    <Header />
    <Background />
    <BookingApp />

  </>)
  
}

export default App
