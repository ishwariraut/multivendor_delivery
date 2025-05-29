'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material'
import { styled } from '@mui/material/styles'
import MyLocationIcon from '@mui/icons-material/MyLocation'

// Dynamically import the LocationTracker component
const LocationTracker = dynamic(
  () => import('./LocationTracker'),
  { ssr: false }
)

// Styled components
const MapControls = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1)
}))

const ControlButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[4]
  }
}))

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = {
  lat: 0,
  lng: 0
}

const options = {
  disableDefaultUI: true,
  zoomControl: true,        // Enable native zoom control
  scaleControl: true,       // Enable native scale control
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false
}

interface MapComponentProps {
  orderId: string
}

export default function MapComponent({ orderId }: MapComponentProps) {
  const [isFollowing, setIsFollowing] = useState(true)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAacayvOsrT9V6wh3iY1DShwJjpw_AlynE'
  })

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleDragStart = useCallback(() => {
    if (isFollowing) {
      setIsFollowing(false)
    }
  }, [isFollowing])

  if (loadError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        Error loading maps
      </Box>
    )
  }

  if (!isLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onDragStart={handleDragStart}
        options={options}
      >
        <LocationTracker 
          map={map}
          orderId={orderId}
          isFollowing={isFollowing}
          onFollowingChange={setIsFollowing}
        />
      </GoogleMap>
      <MapControls>
        <Tooltip title={isFollowing ? "Stop following" : "Follow location"}>
          <ControlButton 
            onClick={() => setIsFollowing(!isFollowing)}
            color={isFollowing ? "primary" : "default"}
          >
            <MyLocationIcon />
          </ControlButton>
        </Tooltip>
      </MapControls>
    </Box>
  )
}