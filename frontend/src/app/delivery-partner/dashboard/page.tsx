'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  CircularProgress, 
  Alert, 
  Paper,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material'
import { io } from 'socket.io-client'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PersonIcon from '@mui/icons-material/Person'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import RefreshIcon from '@mui/icons-material/Refresh'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import DirectionsIcon from '@mui/icons-material/Directions'
import { styled } from '@mui/material/styles'
import dynamic from 'next/dynamic'
import { startTracking, stopTracking } from '@/utils/GeoTracker'

// Dynamically import the Map component with no SSR
const MapComponent = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    )
  }
)

// Styled components
const MapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.spacing(2),
    overflow: 'hidden'
  }
}))

const MapContainerWrapper = styled(Box)(({ theme }) => ({
  height: '70vh',
  width: '100%',
  position: 'relative',
  '& .leaflet-container': {
    borderRadius: theme.spacing(1)
  }
}))

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
  }
  locations?: {
    latitude: number
    longitude: number
    timestamp: string
  }[]
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'warning'
    case 'ASSIGNED':
      return 'info'
    case 'PICKED_UP':
      return 'primary'
    case 'IN_TRANSIT':
      return 'primary'
    case 'DELIVERED':
      return 'success'
    case 'CANCELLED':
      return 'error'
    default:
      return 'default'
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function DeliveryPartnerDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null)
  const [tracking, setTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral | null>(null)

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

  const fetchData = async () => {
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
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch orders')
      }
      
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update order status')
      }

      const updatedOrder = await response.json()
      setOrders(orders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ))
    } catch (error) {
      console.error('Error updating order status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update order status. Please try again.')
    }
  }

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'ASSIGNED':
        return 'PICKED_UP'
      case 'PICKED_UP':
        return 'IN_TRANSIT'
      case 'IN_TRANSIT':
        return 'DELIVERED'
      default:
        return null
    }
  }

  const handleStartTracking = (order: Order) => {
    console.log('Starting tracking for order:', order.id);
    startTracking(order.id, user.id, (location) => {
      setCurrentLocation(location)
      console.log('Sending location:', location);
      // Optionally update location history here
    })
    setTracking(true)
    setTrackingOrder(order)
  }

  const handleStopTracking = () => {
    console.log('Stopping tracking');
    stopTracking()
    setTracking(false)
    setTrackingOrder(null)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Delivery Partner Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!tracking && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tracking is not active. Click <b>Track</b> on an order to start sharing your location.
        </Alert>
      )}

      {orders.length === 0 ? (
        <Alert severity="info">No orders assigned to you.</Alert>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid 
              key={order.id}
              sx={{
                width: {
                  xs: '100%',
                  md: '50%',
                  lg: '33.33%'
                },
                p: 1
              }}
            >
              <Paper 
                elevation={2}
                sx={{ 
                  p: 2,
                  height: '100%',
                  '&:hover': {
                    boxShadow: 4
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    Order #{order.orderNumber}
                  </Typography>
                  <Chip 
                    label={order.status} 
                    color={getStatusColor(order.status) as any}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon color="action" />
                    <Typography variant="body2">
                      Customer: {order.customer.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {order.customer.email}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ShoppingCartIcon color="action" />
                    <Typography variant="body2">
                      Vendor: {order.vendor.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {order.vendor.email}
                  </Typography>
                </Box>

                {order.locations && order.locations.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    <LocationOnIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {new Date(order.locations[0].timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {getNextStatus(order.status) && (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                    >
                      Mark as {getNextStatus(order.status)}
                    </Button>
                  )}
                  {order.status === 'IN_TRANSIT' && (
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<MyLocationIcon />}
                      onClick={() => handleStartTracking(order)}
                    >
                      Track
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {trackingOrder && (
        <MapDialog
          open={!!trackingOrder}
          onClose={handleStopTracking}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText'
          }}>
            <Typography variant="h6">
              Tracking Order #{trackingOrder?.orderNumber}
            </Typography>
            <Button 
              onClick={handleStopTracking}
              sx={{ color: 'primary.contrastText' }}
            >
              Close
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <MapContainerWrapper>
              <MapComponent orderId={trackingOrder.id} />
            </MapContainerWrapper>
          </DialogContent>
        </MapDialog>
      )}
    </Box>
  )
} 