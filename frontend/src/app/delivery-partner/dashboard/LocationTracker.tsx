'use client'

import { useEffect, useState } from 'react'
import { Marker } from '@react-google-maps/api'
import { Box, Typography } from '@mui/material'
import { io } from 'socket.io-client'

interface LocationTrackerProps {
  map: google.maps.Map | null
  orderId: string
  isFollowing: boolean
  onFollowingChange: (isFollowing: boolean) => void
}

interface Location {
  lat: number
  lng: number
}

export default function LocationTracker({ map, orderId, isFollowing, onFollowingChange }: LocationTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<any>(null)

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'https://multivendor-delivery.onrender.com')
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!map) return

    const getLocation = () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser')
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setCurrentLocation(newLocation)
          setError(null)

          // Emit location update
          if (socket) {
            socket.emit('locationUpdate', {
              orderId,
              location: newLocation
            })
          }

          // Center map if following
          if (isFollowing) {
            map.panTo(newLocation)
          }
        },
        (error) => {
          setError('Unable to retrieve your location')
          console.error('Geolocation error:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    }

    // Get initial location
    getLocation()

    // Set up location watcher
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setCurrentLocation(newLocation)
        setError(null)

        // Emit location update
        if (socket) {
          socket.emit('locationUpdate', {
            orderId,
            location: newLocation
          })
        }

        // Center map if following
        if (isFollowing) {
          map.panTo(newLocation)
        }
      },
      (error) => {
        setError('Unable to retrieve your location')
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )

    // Handle map movement
    const dragListener = map.addListener('dragstart', () => {
      if (isFollowing) {
        onFollowingChange(false)
      }
    })

    return () => {
      navigator.geolocation.clearWatch(watchId)
      google.maps.event.removeListener(dragListener)
    }
  }, [map, orderId, socket, isFollowing, onFollowingChange])

  if (error) {
    return (
      <Box sx={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 2,
        borderRadius: 1,
        zIndex: 1000
      }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  if (!currentLocation) {
    return null
  }

  return (
    <Marker
      position={currentLocation}
      icon={{
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#FF0000',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      }}
    />
  )
} 