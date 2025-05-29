import { io, Socket } from 'socket.io-client';

let watchId: number | null = null;
let socket: Socket | null = null;

export function startTracking(orderId: string, userId: string, onLocation: (location: { lat: number, lng: number }) => void) {
  if (watchId !== null) return; // Already tracking

  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }

  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: { token: localStorage.getItem('token') }
    });
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const location = { lat: latitude, lng: longitude };
      onLocation(location);

      // Emit location update through socket
      if (socket) {
        socket.emit('update-location', {
          orderId,
          deliveryPartnerId: userId,
          latitude,
          longitude
        });
      }
    },
    (error) => {
      alert('Failed to get your location. Please check your location settings.');
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );
}

export function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
} 