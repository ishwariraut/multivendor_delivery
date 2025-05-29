// simulateLocation.js
const axios = require('axios');

// === CONFIGURATION ===
// Set your backend API URL (use local IP or ngrok backend URL)
const API_URL = 'http://localhost:3001/api/location/update'; // Change if needed
// Paste your delivery partner JWT token here
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlZWRkZTQ3Mi00NzM5LTQ0YjgtODNlNy0xN2UzNDcwZTlhYjUiLCJyb2xlIjoiREVMSVZFUllfUEFSVE5FUiIsImlhdCI6MTc0ODUxNjk3MSwiZXhwIjoxNzQ4NjAzMzcxfQ.PbvDVISJXLgwmIHGBGi4GK4liQq0Y-HpGxq4tPYintE';
const ORDER_ID = 'e997545f-3a9f-40c1-b267-6c0f3ab78cf2'; // Example UUID format

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