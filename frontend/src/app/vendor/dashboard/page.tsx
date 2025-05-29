'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Grid, 
  CircularProgress, 
  Alert, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Box,
  Paper,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material'
import { io } from 'socket.io-client'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PersonIcon from '@mui/icons-material/Person'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'

interface Order {
  id: string
  orderNumber: string
  status: string
  customer: {
    name: string
    email: string
  }
  deliveryPartner?: {
    id: string
    name: string
    email: string
  }
  locations?: {
    latitude: number
    longitude: number
    timestamp: string
  }[]
}

interface DeliveryPartner {
  id: string
  name: string
  email: string
  status: string
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

export default function VendorDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<string>('')
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false)
  const [newOrderCustomer, setNewOrderCustomer] = useState('')

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

      // Fetch orders
      const ordersResponse = await fetch(`${API_URL}/api/orders/vendor`, {
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

      // Fetch delivery partners
      const partnersResponse = await fetch(`${API_URL}/api/users/delivery-partners`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (!partnersResponse.ok) {
        const errorData = await partnersResponse.json()
        throw new Error(errorData.message || 'Failed to fetch delivery partners')
      }
      
      const partnersData = await partnersResponse.json()
      setDeliveryPartners(partnersData)
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

  const handleAssignClick = (order: Order) => {
    setSelectedOrder(order)
    setSelectedPartner('')
    setAssignDialogOpen(true)
  }

  const handleAssignClose = () => {
    setAssignDialogOpen(false)
    setSelectedOrder(null)
    setSelectedPartner('')
  }

  const handleAssign = async () => {
    if (!selectedOrder || !selectedPartner) return

    try {
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(
        `${API_URL}/api/orders/${selectedOrder.id}/assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ deliveryPartnerId: selectedPartner }),
          credentials: 'include'
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to assign delivery partner')
      }

      const updatedOrder = await response.json()
      setOrders(orders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ))
      handleAssignClose()
    } catch (error) {
      console.error('Error assigning delivery partner:', error)
      setError(error instanceof Error ? error.message : 'Failed to assign delivery partner. Please try again.')
    }
  }

  const handleCreateOrder = async () => {
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
        body: JSON.stringify({ customerId: newOrderCustomer }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create order')
      }

      const newOrder = await response.json()
      setOrders([newOrder, ...orders])
      setCreateOrderDialogOpen(false)
      setNewOrderCustomer('')
    } catch (error) {
      console.error('Error creating order:', error)
      setError(error instanceof Error ? error.message : 'Failed to create order. Please try again.')
    }
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
          Vendor Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOrderDialogOpen(true)}
          >
            New Order
          </Button>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {orders.length === 0 ? (
        <Alert severity="info">No orders found.</Alert>
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

                {order.deliveryPartner ? (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocalShippingIcon color="action" />
                      <Typography variant="body2">
                        Delivery Partner: {order.deliveryPartner.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {order.deliveryPartner.email}
                    </Typography>
                  </Box>
                ) : (
                  order.status === 'PENDING' && (
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      startIcon={<LocalShippingIcon />}
                      onClick={() => handleAssignClick(order)}
                    >
                      Assign Delivery Partner
                    </Button>
                  )
                )}

                {order.locations && order.locations.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    <LocationOnIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {new Date(order.locations[0].timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Assign Delivery Partner Dialog */}
      <Dialog open={assignDialogOpen} onClose={handleAssignClose}>
        <DialogTitle>Assign Delivery Partner</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Delivery Partner</InputLabel>
            <Select
              value={selectedPartner}
              label="Delivery Partner"
              onChange={(e) => setSelectedPartner(e.target.value)}
            >
              {deliveryPartners
                .filter(partner => partner.status !== 'OFFLINE')
                .map((partner) => (
                  <MenuItem key={partner.id} value={partner.id}>
                    {partner.name} ({partner.email}) - {partner.status}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignClose}>Cancel</Button>
          <Button 
            onClick={handleAssign} 
            variant="contained"
            disabled={!selectedPartner}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={createOrderDialogOpen} onClose={() => setCreateOrderDialogOpen(false)}>
        <DialogTitle>Create New Order</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Customer ID"
            type="text"
            fullWidth
            value={newOrderCustomer}
            onChange={(e) => setNewOrderCustomer(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOrderDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateOrder} 
            variant="contained"
            disabled={!newOrderCustomer}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 