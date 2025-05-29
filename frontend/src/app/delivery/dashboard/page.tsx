'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress, 
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Container,
  Stack,
  Avatar,
  LinearProgress,
  Fade,
  Slide
} from '@mui/material'
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api'
import { io } from 'socket.io-client'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import RefreshIcon from '@mui/icons-material/Refresh'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import PersonIcon from '@mui/icons-material/Person'
import StoreIcon from '@mui/icons-material/Store'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import MyLocationIcon from '@mui/icons-material/MyLocation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://multivendor-delivery.onrender.com.'

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px'
}

const options = {
  disableDefaultUI: true,
  zoomControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
}

interface Order {
  id: string
  orderNumber: string
  status: string
  customer: {
    name: string
    email: string
  }
  vendor: {
    name: string
    email: string
    location: {
      latitude: number
      longitude: number
    }
  }
  locations?: {
    latitude: number
    longitude: number
    timestamp: string
  }[]
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'DELIVERED': return 'success'
    case 'IN_TRANSIT': return 'primary'
    case 'PICKED_UP': return 'info'
    case 'ASSIGNED': return 'warning'
    default: return 'default'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'DELIVERED': return <CheckCircleIcon />
    case 'IN_TRANSIT': return <LocalShippingIcon />
    case 'PICKED_UP': return <LocalShippingIcon />
    case 'ASSIGNED': return <AccessTimeIcon />
    default: return <AccessTimeIcon />
  }
}

export default function DeliveryDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [tracking, setTracking] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [locationHistory, setLocationHistory] = useState<google.maps.LatLngLiteral[]>([])

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAacayvOsrT9V6wh3iY1DShwJjpw_AlynE'
  })

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Authentication token not found. Please login again.')
      return
    }

    const newSocket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
      setError(null)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setError('Failed to connect to real-time updates. Please refresh the page.')
    })

    newSocket.on('order-updated', (updatedOrder: Order) => {
      setOrders(prevOrders => 
        prevOrders.map(order => order.id === updatedOrder.id ? updatedOrder : order)
      )
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError(error instanceof Error ? error.message : 'Failed to load orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  const handleStartDelivery = async (order: Order) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: order.status === 'ASSIGNED' ? 'PICKED_UP' : 'IN_TRANSIT'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update order status')
      }

      const updatedOrder = await response.json()
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
      )
    } catch (error) {
      console.error('Error updating order status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update order status')
    }
  }

  const handleCompleteDelivery = async (order: Order) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'DELIVERED'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update order status')
      }

      const updatedOrder = await response.json()
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
      )
    } catch (error) {
      console.error('Error updating order status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update order status')
    }
  }

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newLocation = { lat: latitude, lng: longitude }
        setCurrentLocation(newLocation)
        setLocationHistory(prev => [...prev, newLocation])

        // Emit location update through socket
        if (socket && orders.length > 0) {
          const activeOrder = orders.find(order => 
            order.status === 'ASSIGNED' || order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT'
          )

          if (activeOrder) {
            socket.emit('update-location', {
              orderId: activeOrder.id,
              deliveryPartnerId: user?.id,
              latitude,
              longitude
            })
          }
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        setError('Failed to get your location. Please check your location settings.')
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    )

    setWatchId(id)
    setTracking(true)
  }, [socket, orders, user?.id])

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
    setTracking(false)
  }, [watchId])

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 3 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" color="text.secondary">
            Loading your deliveries...
          </Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Fade in timeout={800}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 3, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Delivery Dashboard
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Welcome back, manage your deliveries efficiently
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={2} alignItems="center">
              {currentLocation && (
                <Chip 
                  icon={<MyLocationIcon />} 
                  label="Location Active" 
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white' }
                  }} 
                />
              )}
              
              <Button
                variant="contained"
                color={tracking ? 'error' : 'success'}
                startIcon={tracking ? <StopIcon /> : <PlayArrowIcon />}
                onClick={tracking ? stopTracking : startTracking}
                sx={{ 
                  backgroundColor: tracking ? '#f44336' : '#4caf50',
                  '&:hover': {
                    backgroundColor: tracking ? '#d32f2f' : '#388e3c'
                  }
                }}
              >
                {tracking ? 'Stop Tracking' : 'Start Tracking'}
              </Button>
              
              <Tooltip title="Refresh Data">
                <IconButton 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  sx={{ 
                    color: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          
          {refreshing && (
            <LinearProgress 
              sx={{ 
                mt: 2, 
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': { backgroundColor: 'white' }
              }} 
            />
          )}
        </Paper>
      </Fade>

      {/* Error Alert */}
      {error && (
        <Slide direction="down" in={!!error} timeout={500}>
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        </Slide>
      )}

      {/* Orders Section */}
      {orders.length === 0 ? (
        <Fade in timeout={1000}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 6, 
              textAlign: 'center', 
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            }}
          >
            <LocalShippingIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
              No Active Deliveries
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You're all caught up! New orders will appear here when assigned.
            </Typography>
          </Paper>
        </Fade>
      ) : (
        <Stack spacing={3}>
          {orders.map((order, index) => (
            <Slide key={order.id} direction="up" in timeout={500 + index * 100}>
              <Card 
                elevation={3}
                sx={{ 
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ p: 0 }}>
                  {/* Status Header */}
                  <Box 
                    sx={{ 
                      p: 2,
                      background: `linear-gradient(135deg, ${
                        order.status === 'DELIVERED' ? '#4caf50, #66bb6a' :
                        order.status === 'IN_TRANSIT' ? '#2196f3, #42a5f5' :
                        order.status === 'PICKED_UP' ? '#ff9800, #ffb74d' :
                        '#9e9e9e, #bdbdbd'
                      })`,
                      color: 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(order.status)}
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Order #{order.orderNumber}
                      </Typography>
                    </Box>
                    <Chip 
                      label={order.status.replace('_', ' ')} 
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>

                  <Box sx={{ p: 3 }}>
                    <Stack spacing={3}>
                      {/* Customer & Vendor Info */}
                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Paper elevation={1} sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 250 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, backgroundColor: 'primary.main' }}>
                              <PersonIcon />
                            </Avatar>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              Customer
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {order.customer.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {order.customer.email}
                          </Typography>
                        </Paper>

                        <Paper elevation={1} sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 250 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, backgroundColor: 'success.main' }}>
                              <StoreIcon />
                            </Avatar>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              Vendor
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {order.vendor.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {order.vendor.email}
                          </Typography>
                        </Paper>
                      </Box>

                      {/* Last Updated */}  
                      {order.locations && order.locations.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeIcon color="action" fontSize="small" />
                          <Typography variant="body2" color="text.secondary">
                            Last updated: {new Date(order.locations[0].timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      )}

                      {/* Action Buttons */}
                      <Stack direction="row" spacing={2}>
                        {(order.status === 'ASSIGNED' || order.status === 'PICKED_UP') && (
                          <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleStartDelivery(order)}
                            sx={{ flex: 1, py: 1.5, borderRadius: 2 }}
                          >
                            {order.status === 'ASSIGNED' ? 'Start Delivery' : 'Continue Delivery'}
                          </Button>
                        )}
                        {order.status === 'IN_TRANSIT' && (
                          <Button
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleCompleteDelivery(order)}
                            sx={{ flex: 1, py: 1.5, borderRadius: 2 }}
                          >
                            Complete Delivery
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Slide>
          ))}
        </Stack>
      )}

      {/* Map Section */}
      <Fade in timeout={1200}>
        <Paper 
          elevation={4} 
          sx={{ 
            mt: 4, 
            height: '70vh', 
            overflow: 'hidden',
            borderRadius: 3,
            position: 'relative'
          }}
        >
          {loadError ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                <Typography variant="h6">Error loading maps</Typography>
                <Typography variant="body2">Please check your internet connection and try again.</Typography>
              </Alert>
            </Box>
          ) : !isLoaded ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 2 }}>
              <CircularProgress size={50} />
              <Typography variant="body1" color="text.secondary">
                Loading map...
              </Typography>
            </Box>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={currentLocation || { lat: 0, lng: 0 }}
              zoom={13}
              options={options}
            >
              {/* Current Location Marker */}
              {currentLocation && (
                <Marker
                  position={currentLocation}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#FF4444',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3
                  }}
                />
              )}

              {/* Vendor Markers */}
              {orders.map(order => (
                order.vendor.location && (
                  <Marker
                    key={order.id}
                    position={{ 
                      lat: order.vendor.location.latitude, 
                      lng: order.vendor.location.longitude 
                    }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: '#4CAF50',
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2
                    }}
                  />
                )
              ))}

              {/* Location History Path */}
              {locationHistory.length > 1 && (
                <Polyline
                  path={locationHistory}
                  options={{
                    strokeColor: '#2196F3',
                    strokeWeight: 4,
                    strokeOpacity: 0.8
                  }}
                />
              )}
            </GoogleMap>
          )}
        </Paper>
      </Fade>
    </Container>
  )
}