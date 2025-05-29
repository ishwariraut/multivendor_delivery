'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
} from '@chakra-ui/react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '@/hooks/useAuth'
import { icon } from 'leaflet'

// Fix for default marker icon in Leaflet
const defaultIcon = icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface Order {
  id: string
  orderNumber: string
  status: string
  vendor: {
    name: string
  }
  deliveryPartner: {
    name: string
  }
}

interface Location {
  latitude: number
  longitude: number
  timestamp: string
}

export default function TrackOrderPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchOrderDetails()
    setupLocationTracking()
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      setOrder(response.data)
    } catch (error) {
      setError('Error fetching order details')
    }
  }

  const setupLocationTracking = () => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')

    socket.emit('join-order-tracking', orderId)

    socket.on('location-updated', (data: Location) => {
      setLocation(data)
    })

    return () => {
      socket.disconnect()
    }
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={10}>
        <Text color="red.500">{error}</Text>
      </Container>
    )
  }

  if (!order || !location) {
    return (
      <Container maxW="container.xl" py={10}>
        <Text>Loading...</Text>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg">Track Order</Heading>
          <Text mt={2} color="gray.600">
            Order #{order.orderNumber}
          </Text>
        </Box>

        <HStack spacing={4}>
          <Badge colorScheme="blue">{order.status}</Badge>
          <Text>Vendor: {order.vendor.name}</Text>
          <Text>Delivery Partner: {order.deliveryPartner.name}</Text>
        </HStack>

        <Box h="500px" borderRadius="lg" overflow="hidden">
          <MapContainer
            center={[location.latitude, location.longitude]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker
              position={[location.latitude, location.longitude]}
              icon={defaultIcon}
            >
              <Popup>
                Delivery Partner: {order.deliveryPartner.name}
                <br />
                Last updated: {new Date(location.timestamp).toLocaleString()}
              </Popup>
            </Marker>
          </MapContainer>
        </Box>
      </VStack>
    </Container>
  )
} 