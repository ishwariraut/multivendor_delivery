// simulateLocation.js
const axios = require('axios');

// === CONFIGURATION ===
// Set your backend API URL (use local IP or ngrok backend URL)
const API_URL = 'http://localhost:3001/api/location/update'; // Change if needed
// Paste your delivery partner JWT token here
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZWUzNjU5Ny01NDEyLTRkZTYtYWY0NS0zMTMxNjA0YTA0ZGYiLCJyb2xlIjoiREVMSVZFUllfUEFSVE5FUiIsImlhdCI6MTc0ODQ1NzU4OSwiZXhwIjoxNzQ4NTQzOTg5fQ.nDaNOpPcl2VEWgpMdtbvGbzgEYZGrqZVNF6_Ft7Y8Wg'
const ORDER_ID = '8a845e45-c0aa-4c6f-a866-4e3ba3062928'; // Example UUID format

// Starting location (latitude, longitude)
let latitude = 19.0476;
let longitude = 73.0699;

// Simulate movement
function randomStep() {
  latitude += (Math.random() - 0.5) * 0.0005;
  longitude += (Math.random() - 0.5) * 0.0005;
}

async function sendLocation() {
  randomStep();
  try {
    const res = await axios.post(API_URL, {
      latitude,
      longitude,
      orderId: ORDER_ID
    }, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Location sent:', { latitude, longitude, orderId: ORDER_ID });
  } catch (err) {
    console.error('Failed to send location:', err.response ? err.response.data : err.message);
  }
}

// Send location every 2 seconds
setInterval(sendLocation, 2000); 