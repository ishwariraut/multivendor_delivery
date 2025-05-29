'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material'
import { useRouter } from 'next/navigation'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import RefreshIcon from '@mui/icons-material/Refresh'
import LocationOnIcon from '@mui/icons-material/LocationOn'

interface Vendor {
  id: string
  name: string
  email: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  vendor: {
    name: string
    email: string
  }
  deliveryPartner?: {
    name: string
    email: string
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'warning'
    case 'ASSIGNED':
      return 'info'
    case 'IN_DELIVERY':
      return 'primary'
    case 'DELIVERED':
      return 'success'
    default:
      return 'default'
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function CustomerOrders() {
  const { user } = useAuth()
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      // Fetch vendors
      const vendorsResponse = await fetch(`${API_URL}/api/users/vendors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (!vendorsResponse.ok) {
        const errorData = await vendorsResponse.json()
        throw new Error(errorData.message || 'Failed to fetch vendors')
      }
      
      const vendorsData = await vendorsResponse.json()
      setVendors(vendorsData)

      // Fetch orders
      const ordersResponse = await fetch(`${API_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (!ordersResponse.ok) {
        const errorData = await ordersResponse.json()
        throw new Error(errorData.message || 'Failed to fetch orders')
      }
      
      const ordersData = await ordersResponse.json()
      setOrders(ordersData)
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

  const handlePlaceOrder = async (vendorId: string) => {
    try {
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vendorId }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to place order')
      }

      const newOrder = await response.json()
      setOrders([newOrder, ...orders])
    } catch (error) {
      console.error('Error placing order:', error)
      setError(error instanceof Error ? error.message : 'Failed to place order. Please try again.')
    }
  }

  const handleTrackOrder = (orderId: string) => {
    router.push(`/customer/track/${orderId}`)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          My Orders
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

      {/* Active Orders */}
      <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
        Active Orders
      </Typography>
      {orders.length === 0 ? (
        <Alert severity="info">No active orders found.</Alert>
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
                    <ShoppingCartIcon color="action" />
                    <Typography variant="body2">
                      Vendor: {order.vendor.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {order.vendor.email}
                  </Typography>
                </Box>

                {order.deliveryPartner && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationOnIcon color="action" />
                      <Typography variant="body2">
                        Delivery Partner: {order.deliveryPartner.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {order.deliveryPartner.email}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => handleTrackOrder(order.id)}
                >
                  Track Order
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Available Vendors */}
      <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
        Available Vendors
      </Typography>
      {vendors.length === 0 ? (
        <Alert severity="info">No vendors available.</Alert>
      ) : (
        <Grid container spacing={3}>
          {vendors.map((vendor) => (
            <Grid 
              key={vendor.id}
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
                <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                  {vendor.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {vendor.email}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => handlePlaceOrder(vendor.id)}
                >
                  Place Order
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
} 