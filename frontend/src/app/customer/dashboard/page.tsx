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
  Card,
  CardContent,
  CardActions,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Container,
  Stack
} from '@mui/material'
import { useRouter } from 'next/navigation'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import RefreshIcon from '@mui/icons-material/Refresh'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AddIcon from '@mui/icons-material/Add'
import StoreIcon from '@mui/icons-material/Store'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/Pending'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

interface Vendor {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  category?: string
  rating?: number
  isActive?: boolean
}

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  updatedAt: string
  totalAmount?: number
  vendor: {
    id: string
    name: string
    email: string
  }
  deliveryPartner?: {
    id: string
    name: string
    email: string
    phone?: string
  }
  deliveryAddress?: string
  notes?: string
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'warning'
    case 'CONFIRMED':
      return 'info'
    case 'ASSIGNED':
      return 'info'
    case 'IN_PREPARATION':
      return 'primary'
    case 'IN_DELIVERY':
      return 'primary'
    case 'OUT_FOR_DELIVERY':
      return 'primary'
    case 'DELIVERED':
      return 'success'
    case 'CANCELLED':
      return 'error'
    default:
      return 'default'
  }
}

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return <PendingIcon />
    case 'CONFIRMED':
    case 'ASSIGNED':
    case 'IN_PREPARATION':
      return <AccessTimeIcon />
    case 'IN_DELIVERY':
    case 'OUT_FOR_DELIVERY':
      return <LocalShippingIcon />
    case 'DELIVERED':
      return <CheckCircleIcon />
    default:
      return <AccessTimeIcon />
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [liveOrders, setLiveOrders] = useState<Order[]>([])
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<string>('')
  const [orderNotes, setOrderNotes] = useState<string>('')
  const [placingOrder, setPlacingOrder] = useState(false)
  const [currentTab, setCurrentTab] = useState(0)

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_URL}/api/users/vendors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch vendors')
      }
      
      const vendorsData = await response.json()
      setVendors(vendorsData)
    } catch (error) {
      console.error('Error fetching vendors:', error)
      throw error
    }
  }

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      // Fetch all orders
      const ordersResponse = await fetch(`${API_URL}/api/orders/customer`, {
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
      
      const allOrders = await ordersResponse.json()
      
      // Separate live and delivered orders
      const live = allOrders.filter((order: Order) => 
        !['DELIVERED', 'CANCELLED'].includes(order.status.toUpperCase())
      )
      const delivered = allOrders.filter((order: Order) => 
        ['DELIVERED', 'CANCELLED'].includes(order.status.toUpperCase())
      )
      
      setLiveOrders(live)
      setDeliveredOrders(delivered)
    } catch (error) {
      console.error('Error fetching orders:', error)
      throw error
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([fetchVendors(), fetchOrders()])
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

  const handlePlaceOrder = async () => {
    try {
      setPlacingOrder(true)
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
        body: JSON.stringify({ 
          vendorId: selectedVendor,
          notes: orderNotes || undefined
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to place order')
      }

      const newOrder = await response.json()
      setLiveOrders([newOrder, ...liveOrders])
      setCreateOrderDialogOpen(false)
      setSelectedVendor('')
      setOrderNotes('')
      
      // Switch to live orders tab to see the new order
      setCurrentTab(1)
    } catch (error) {
      console.error('Error placing order:', error)
      setError(error instanceof Error ? error.message : 'Failed to place order. Please try again.')
    } finally {
      setPlacingOrder(false)
    }
  }

  const handleTrackOrder = (orderId: string) => {
    router.push(`/customer/track/${orderId}`)
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue)
  }

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Customer Dashboard
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

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StoreIcon />
                  Place Order
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalShippingIcon />
                  Live Orders
                  {liveOrders.length > 0 && (
                    <Badge badgeContent={liveOrders.length} color="primary" />
                  )}
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon />
                  Order History
                  {deliveredOrders.length > 0 && (
                    <Badge badgeContent={deliveredOrders.length} color="default" />
                  )}
                </Box>
              } 
            />
          </Tabs>

          {/* Place Order Tab */}
          <TabPanel value={currentTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Select a Vendor to Place Order
              </Typography>
              
              {vendors.length === 0 ? (
                <Alert severity="info">No vendors available at the moment.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {vendors.map((vendor) => (
                    <Box
                      key={vendor.id}
                      sx={{
                        width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' },
                        minWidth: '280px'
                      }}
                    >
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-2px)'
                          }
                        }}
                        onClick={() => {
                          setSelectedVendor(vendor.id)
                          setCreateOrderDialogOpen(true)
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              <StoreIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" component="h3">
                                {vendor.name}
                              </Typography>
                              {vendor.category && (
                                <Chip 
                                  label={vendor.category} 
                                  size="small" 
                                  color="secondary"
                                />
                              )}
                            </Box>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {vendor.email}
                          </Typography>
                          
                          {vendor.phone && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              📞 {vendor.phone}
                            </Typography>
                          )}
                          
                          {vendor.address && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              📍 {vendor.address}
                            </Typography>
                          )}
                          
                          {vendor.rating && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2">
                                ⭐ {vendor.rating}/5
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                        <CardActions>
                          <Button 
                            fullWidth 
                            variant="contained" 
                            startIcon={<AddIcon />}
                          >
                            Place Order
                          </Button>
                        </CardActions>
                      </Card>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Live Orders Tab */}
          <TabPanel value={currentTab} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Active Orders ({liveOrders.length})
              </Typography>
              
              {liveOrders.length === 0 ? (
                <Alert severity="info">
                  No active orders. Place a new order from the "Place Order" tab.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {liveOrders.map((order) => (
                    <Box
                      key={order.id}
                      sx={{
                        width: { xs: '100%', md: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' },
                        minWidth: '320px'
                      }}
                    >
                      <Card 
                        elevation={3}
                        sx={{ 
                          height: '100%',
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 6
                          }
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" component="h3">
                              #{order.orderNumber}
                            </Typography>
                            <Chip 
                              label={order.status}
                              color={getStatusColor(order.status) as any}
                              icon={getStatusIcon(order.status)}
                              size="small"
                            />
                          </Box>

                          <Divider sx={{ my: 2 }} />

                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="subtitle2" color="primary">
                                Vendor
                              </Typography>
                              <Typography variant="body2">
                                {order.vendor.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {order.vendor.email}
                              </Typography>
                            </Box>

                            {order.deliveryPartner && (
                              <Box>
                                <Typography variant="subtitle2" color="primary">
                                  Delivery Partner
                                </Typography>
                                <Typography variant="body2">
                                  {order.deliveryPartner.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {order.deliveryPartner.email}
                                </Typography>
                              </Box>
                            )}

                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Order placed: {new Date(order.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>

                            {order.totalAmount && (
                              <Box>
                                <Typography variant="subtitle2" color="primary">
                                  Amount: ₹{order.totalAmount}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                        <CardActions>
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => handleTrackOrder(order.id)}
                          >
                            Track Order
                          </Button>
                        </CardActions>
                      </Card>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Order History Tab */}
          <TabPanel value={currentTab} index={2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Order History ({deliveredOrders.length})
              </Typography>
              
              {deliveredOrders.length === 0 ? (
                <Alert severity="info">No completed orders yet.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {deliveredOrders.map((order) => (
                    <Box
                      key={order.id}
                      sx={{
                        width: { xs: '100%', md: 'calc(50% - 12px)' },
                        minWidth: '320px'
                      }}
                    >
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" component="h3">
                              #{order.orderNumber}
                            </Typography>
                            <Chip 
                              label={order.status}
                              color={getStatusColor(order.status) as any}
                              size="small"
                            />
                          </Box>

                          <Stack spacing={1}>
                            <Typography variant="body2">
                              <strong>Vendor:</strong> {order.vendor.name}
                            </Typography>
                            
                            {order.deliveryPartner && (
                              <Typography variant="body2">
                                <strong>Delivered by:</strong> {order.deliveryPartner.name}
                              </Typography>
                            )}
                            
                            <Typography variant="body2">
                              <strong>Ordered:</strong> {new Date(order.createdAt).toLocaleDateString()}
                            </Typography>
                            
                            <Typography variant="body2">
                              <strong>Completed:</strong> {new Date(order.updatedAt).toLocaleDateString()}
                            </Typography>

                            {order.totalAmount && (
                              <Typography variant="body2">
                                <strong>Amount:</strong> ₹{order.totalAmount}
                              </Typography>
                            )}
                          </Stack>
                        </CardContent>
                        <CardActions>
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => handleTrackOrder(order.id)}
                          >
                            View Details
                          </Button>
                        </CardActions>
                      </Card>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </TabPanel>
        </Paper>

        {/* Create Order Dialog */}
        <Dialog 
          open={createOrderDialogOpen} 
          onClose={() => setCreateOrderDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Create New Order
            {selectedVendor && (
              <Typography variant="subtitle2" color="text.secondary">
                {vendors.find(v => v.id === selectedVendor)?.name}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Order Notes (Optional)"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Add any special instructions or notes for your order..."
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setCreateOrderDialogOpen(false)
                setSelectedVendor('')
                setOrderNotes('')
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePlaceOrder} 
              variant="contained"
              disabled={!selectedVendor || placingOrder}
              startIcon={placingOrder ? <CircularProgress size={20} /> : <AddIcon />}
            >
              {placingOrder ? 'Placing Order...' : 'Place Order'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  )
}