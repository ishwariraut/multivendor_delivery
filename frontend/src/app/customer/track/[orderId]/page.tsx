'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Card,
  CardContent,
  Stack,
  Divider,
  LinearProgress,
  Fade,
  Slide
} from '@mui/material';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StoreIcon from '@mui/icons-material/Store';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  mapTypeControl: true,
  gestureHandling: 'greedy'
};

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  vendor: {
    name: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  deliveryPartner?: {
    name: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  locations?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  }[];
}

export default function TrackOrder({ params }: { params: { orderId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 0, lng: 0 });
  const [locationHistory, setLocationHistory] = useState<google.maps.LatLngLiteral[]>([]);
  const [currentZoom, setCurrentZoom] = useState(17);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [locationUpdateCount, setLocationUpdateCount] = useState(0);
  const [autoFollowDelivery, setAutoFollowDelivery] = useState(true); // New state for auto-follow
  const [userInteractedWithMap, setUserInteractedWithMap] = useState(false); // Track user interaction
  const mapRef = useRef<google.maps.Map | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPanTime = useRef<number>(0); // Prevent excessive panning

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAacayvOsrT9V6wh3iY1DShwJjpw_AlynE'
  });

  // Smooth pan function with throttling
  const smoothPanToLocation = (lat: number, lng: number) => {
    const now = Date.now();
    // Throttle panning to max once every 2 seconds to prevent excessive movement
    if (now - lastPanTime.current < 2000) {
      return;
    }
    
    if (mapRef.current && autoFollowDelivery && !userInteractedWithMap) {
      lastPanTime.current = now;
      
      // Use a more gentle pan instead of immediate jump
      try {
        requestAnimationFrame(() => {
          if (mapRef.current) {
            const currentCenter = mapRef.current.getCenter();
            const newCenter = { lat, lng };
            
            // Only pan if the distance is significant (more than ~50 meters)
            if (currentCenter) {
              const distance = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(currentCenter.lat(), currentCenter.lng()),
                new google.maps.LatLng(lat, lng)
              );
              
              // Only pan if delivery partner moved significantly
              if (distance > 50) {
                mapRef.current.panTo(newCenter);
              }
            } else {
              mapRef.current.panTo(newCenter);
            }
          }
        });
      } catch (error) {
        console.error('❌ Error panning map:', error);
      }
    }
  };

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found');
      return;
    }

    console.log('🔌 Initializing socket connection...');
    const newSocket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnectionStatus('connected');
      console.log('📡 Joining order room:', params.orderId);
      newSocket.emit('join-order-room', params.orderId);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus('disconnected');
      setError('Failed to connect to real-time updates. Please refresh the page.');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    // Listen for location updates with comprehensive debugging
    newSocket.on('location-update', (data: { latitude: number; longitude: number; timestamp: string }) => {
      console.log('\n🔍 SOCKET DEBUG - Received location update:');
      console.log('Raw data:', data);
      
      // Convert to numbers to ensure they're not strings
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      
      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        console.error('❌ Invalid coordinates received:', { lat, lng, original: data });
        return;
      }
      
      // Additional range validation
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('❌ Coordinates out of range:', { lat, lng });
        return;
      }
      
      console.log('✅ Coordinates validated successfully');
      setLastUpdateTime(new Date().toLocaleTimeString());
      setIsLiveTracking(true);
      setLocationUpdateCount(prev => prev + 1);
      
      setOrder((prev) => {
        if (!prev) {
          console.warn('⚠️ No previous order state, skipping update');
          return prev;
        }
        
        const updatedOrder: Order = {
          ...prev,
          deliveryPartner: prev.deliveryPartner ? {
            ...prev.deliveryPartner,
            location: { latitude: lat, longitude: lng }
          } : {
            name: 'Delivery Partner',
            location: { latitude: lat, longitude: lng }
          },
          locations: [
            { latitude: lat, longitude: lng, timestamp: data.timestamp }, 
            ...(prev.locations || [])
          ]
        };
        
        const newCenter = { lat, lng };
        setMapCenter(newCenter);
        
        // Only update zoom and pan smoothly for location updates (not initial load)
        if (!isInitialLoad) {
          setLocationHistory(prev => {
            const newHistory = [newCenter, ...prev.slice(0, 49)];
            return newHistory;
          });
          
          // Use throttled smooth pan instead of immediate pan
          smoothPanToLocation(lat, lng);
        }
        
        return updatedOrder;
      });
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Cleaning up socket connection...');
      newSocket.emit('leave-order-room', params.orderId);
      newSocket.disconnect();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [params.orderId, isInitialLoad, autoFollowDelivery, userInteractedWithMap]);

  // Enhanced polling - every 2 seconds for live tracking when delivery partner is active
  useEffect(() => {
    const startPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      // More frequent polling (2 seconds) when delivery partner is tracking
      const interval = order?.deliveryPartner?.location ? 2000 : 5000;
      
      console.log(`⏰ Starting polling with ${interval/1000}s interval...`);
      pollIntervalRef.current = setInterval(() => {
        console.log('🔄 Polling for live location updates...');
        fetchOrder();
      }, interval);
    };

    // Start polling immediately
    startPolling();
    
    return () => {
      if (pollIntervalRef.current) {
        console.log('⏰ Cleaning up polling interval');
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [params.orderId, order?.deliveryPartner?.location]);

  // Additional real-time polling specifically for delivery partner location
  useEffect(() => {
    if (!order?.deliveryPartner?.location) return;
    
    console.log('🚚 Starting intensive location polling for delivery partner...');
    const locationPollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(
          `${API_URL}/api/orders/${params.orderId}/live-location`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }
        );

        if (response.ok) {
          const locationData = await response.json();
          if (locationData.latitude && locationData.longitude) {
            console.log('📍 Live location poll update:', locationData);
            
            const lat = Number(locationData.latitude);
            const lng = Number(locationData.longitude);
            
            if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
              setLastUpdateTime(new Date().toLocaleTimeString());
              setLocationUpdateCount(prev => prev + 1);
              
              const newCenter = { lat, lng };
              setMapCenter(newCenter);
              
              setOrder(prev => {
                if (!prev) return prev;
                
                return {
                  ...prev,
                  deliveryPartner: prev.deliveryPartner ? {
                    ...prev.deliveryPartner,
                    location: { latitude: lat, longitude: lng }
                  } : {
                    name: 'Delivery Partner',
                    location: { latitude: lat, longitude: lng }
                  },
                  locations: [
                    { latitude: lat, longitude: lng, timestamp: new Date().toISOString() },
                    ...(prev.locations || [])
                  ]
                };
              });
              
              setLocationHistory(prev => {
                const newHistory = [newCenter, ...prev.slice(0, 49)];
                return newHistory;
              });
              
              // Use throttled smooth pan instead of immediate pan
              smoothPanToLocation(lat, lng);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in live location polling:', error);
      }
    }, 2000); // Poll every 2 seconds for live tracking

    return () => {
      console.log('🚚 Cleaning up live location polling');
      clearInterval(locationPollInterval);
    };
  }, [order?.deliveryPartner?.location, params.orderId, autoFollowDelivery, userInteractedWithMap]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${API_URL}/api/orders/${params.orderId}/track`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch order details');
      }

      const data: Order = await response.json();
      setOrder(data);
      
      // Set initial map center and zoom only on first load
      if (isInitialLoad) {
        if (data.locations && data.locations.length > 0) {
          const firstLocation = data.locations[0];
          const centerCoords = { 
            lat: Number(firstLocation.latitude), 
            lng: Number(firstLocation.longitude) 
          };
          setMapCenter(centerCoords);
          setCurrentZoom(17);
          
          const historyCoords = data.locations.map((loc) => ({ 
            lat: Number(loc.latitude), 
            lng: Number(loc.longitude) 
          }));
          setLocationHistory(historyCoords);
        } else if (data.vendor.location) {
          const vendorCoords = { 
            lat: Number(data.vendor.location.latitude), 
            lng: Number(data.vendor.location.longitude) 
          };
          setMapCenter(vendorCoords);
          setCurrentZoom(16);
        }
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      setError(error instanceof Error ? error.message : 'Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [params.orderId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const handleBack = () => {
    router.push('/customer/orders');
  };

  const toggleAutoFollow = () => {
    setAutoFollowDelivery(!autoFollowDelivery);
    if (!autoFollowDelivery && order?.deliveryPartner?.location) {
      // If turning auto-follow back on, immediately pan to current location
      smoothPanToLocation(
        Number(order.deliveryPartner.location.latitude),
        Number(order.deliveryPartner.location.longitude)
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'IN_TRANSIT': return 'primary';
      case 'PREPARING': return 'warning';
      case 'CONFIRMED': return 'info';
      default: return 'default';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 25;
      case 'PREPARING': return 50;
      case 'IN_TRANSIT': return 75;
      case 'DELIVERED': return 100;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading order details...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 'md', mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ p: 3, maxWidth: 'md', mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Order not found
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'grey.50',
      pb: 3
    }}>
      {/* Header Section */}
      <Box sx={{ 
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        p: 3
      }}>
        <Box sx={{ 
          maxWidth: 'lg',
          mx: 'auto',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2
        }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 'bold',
              color: 'primary.main',
              mb: 1
            }}>
              Order #{order.orderNumber}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <StoreIcon color="action" fontSize="small" />
              <Typography variant="h6" color="text.secondary">
                {order.vendor.name}
              </Typography>
            </Box>
            {lastUpdateTime && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon color="action" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Last updated: {lastUpdateTime}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh">
              <IconButton 
                onClick={handleRefresh} 
                disabled={refreshing}
                color="primary"
                sx={{ bgcolor: 'primary.50' }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{ px: 3, py: 1 }}
            >
              Back to Orders
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 'lg', mx: 'auto', p: 3 }}>
        {/* Status and Progress Section */}
        <Fade in={true} timeout={800}>
          <Card sx={{ mb: 3, overflow: 'visible' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2
                }}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={order.status.replace('_', ' ')}
                      color={getStatusColor(order.status)}
                      sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        px: 2,
                        py: 1,
                        height: 40
                      }}
                    />
                    {order.deliveryPartner?.location && (
                      <Chip 
                        label={`Live Tracking • ${locationUpdateCount} updates`}
                        color="success"
                        variant="outlined"
                        icon={<LocationOnIcon />}
                        sx={{ 
                          animation: 'pulse 2s infinite',
                          '@keyframes pulse': {
                            '0%': { opacity: 1, transform: 'scale(1)' },
                            '50%': { opacity: 0.8, transform: 'scale(1.05)' },
                            '100%': { opacity: 1, transform: 'scale(1)' }
                          }
                        }}
                      />
                    )}
                    <Chip 
                      label={connectionStatus === 'connected' ? 'Connected' : 'Reconnecting...'}
                      color={connectionStatus === 'connected' ? 'success' : 'warning'}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  
                  {/* Auto-follow toggle */}
                  {order.deliveryPartner?.location && (
                    <Button
                      size="small"
                      variant={autoFollowDelivery ? "contained" : "outlined"}
                      onClick={toggleAutoFollow}
                      sx={{ minWidth: 120 }}
                    >
                      {autoFollowDelivery ? "Auto-Follow ON" : "Auto-Follow OFF"}
                    </Button>
                  )}
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Order Progress
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={getStatusProgress(order.status)}
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Fade>

        {/* Map Section */}
        <Slide direction="up" in={true} timeout={1000}>
          <Card sx={{ mb: 3, overflow: 'hidden' }}>
            <Box sx={{ 
              height: { xs: '50vh', md: '70vh' },
              position: 'relative'
            }}>
              {loadError ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  bgcolor: 'grey.100'
                }}>
                  <Alert severity="error">Error loading maps</Alert>
                </Box>
              ) : !isLoaded ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  bgcolor: 'grey.100',
                  gap: 2
                }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary">
                    Loading map...
                  </Typography>
                </Box>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={currentZoom}
                  options={{
                    ...options,
                    styles: [
                      {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                      }
                    ]
                  }}
                  onLoad={map => {
                    mapRef.current = map;
                  }}
                  onZoomChanged={() => {
                    if (mapRef.current) {
                      const zoom = mapRef.current.getZoom();
                      setCurrentZoom(zoom || 17);
                    }
                  }}
                  onDragStart={() => {
                    // User started dragging the map, disable auto-follow temporarily
                    setUserInteractedWithMap(true);
                    setTimeout(() => setUserInteractedWithMap(false), 10000); // Re-enable after 10 seconds
                  }}
                  onClick={() => {
                    // User clicked on map, disable auto-follow temporarily
                    setUserInteractedWithMap(true);
                    setTimeout(() => setUserInteractedWithMap(false), 5000); // Re-enable after 5 seconds
                  }}
                >
                  {/* Vendor Marker */}
                  {order.vendor.location && (
                    <Marker
                      position={{ 
                        lat: Number(order.vendor.location.latitude), 
                        lng: Number(order.vendor.location.longitude)
                      }}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#4CAF50',
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 3
                      }}
                      title={`${order.vendor.name} - Restaurant Location`}
                    />
                  )}

                  {/* Delivery Partner Marker */}
                  {order.deliveryPartner?.location && (
                    <Marker
                      position={{ 
                        lat: Number(order.deliveryPartner.location.latitude), 
                        lng: Number(order.deliveryPartner.location.longitude)
                      }}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 15,
                        fillColor: '#FF5722',
                        fillOpacity: 0.9,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 4,
                        strokeOpacity: 1
                      }}
                      title="Live Delivery Location"
                      animation={google.maps.Animation.BOUNCE}
                    />
                  )}

                  {/* Previous locations */}
                  {locationHistory.slice(1).map((location, index) => (
                    <Marker
                      key={`history-${index}`}
                      position={location}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: Math.max(6 - (index * 0.2), 3),
                        fillColor: '#2196F3',
                        fillOpacity: Math.max(0.6 - (index * 0.03), 0.2),
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2
                      }}
                      title={`Previous location ${index + 1}`}
                    />
                  ))}

                  {/* Delivery Path */}
                  {locationHistory.length > 1 && (
                    <Polyline
                      path={locationHistory}
                      options={{
                        strokeColor: '#FF5722',
                        strokeWeight: 3,
                        strokeOpacity: 0.7,
                        geodesic: true
                      }}
                    />
                  )}
                </GoogleMap>
              )}
            </Box>
          </Card>
        </Slide>

        {/* Status Information */}
        <Fade in={true} timeout={1200}>
          <Stack spacing={2}>
            {/* Live tracking status */}
            {order.deliveryPartner?.location ? (
              <Alert 
                severity="success" 
                icon={<DeliveryDiningIcon />}
                sx={{ 
                  '& .MuiAlert-message': { width: '100%' },
                  bgcolor: 'success.50',
                  border: '1px solid',
                  borderColor: 'success.200',
                  animation: isLiveTracking ? 'glow 3s ease-in-out infinite' : 'none',
                  '@keyframes glow': {
                    '0%': { boxShadow: '0 0 5px rgba(76, 175, 80, 0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(76, 175, 80, 0.6)' },
                    '100%': { boxShadow: '0 0 5px rgba(76, 175, 80, 0.3)' }
                  }
                }}
              >
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 1
                }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                      🔴 LIVE: Your delivery partner is moving! (Updates every 2s)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total location updates: {locationUpdateCount} • Last update: {lastUpdateTime}
                      {userInteractedWithMap && " • Auto-follow paused"}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {Number(order.deliveryPartner.location.latitude).toFixed(6)}, {Number(order.deliveryPartner.location.longitude).toFixed(6)}
                  </Typography>
                </Box>
              </Alert>
            ) : (
              <Alert 
                severity="info"
                sx={{ 
                  bgcolor: 'info.50',
                  border: '1px solid',
                  borderColor: 'info.200'
                }}
              >
                <Typography variant="body1">
                  Waiting for delivery partner assignment. Live tracking will begin once your order is picked up.
                </Typography>
              </Alert>
            )}

            {/* Additional order information */}
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon color="primary" />
                Location Details
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="primary">
                    Restaurant Location
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.vendor.name}
                  </Typography>
                </Box>
                {order.deliveryPartner && (
                  <Box>
                    <Typography variant="subtitle2" color="primary">
                      Delivery Partner
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.deliveryPartner.name}
                      {order.deliveryPartner.location ? ' (Currently tracking)' : ' (Not tracking yet)'}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Fade>
      </Box>
    </Box>
  );
}