'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (user) {
      switch (user.role) {
        case 'VENDOR':
          router.push('/vendor/dashboard')
          break
        case 'DELIVERY_PARTNER':
          router.push('/delivery/dashboard')
          break
        case 'CUSTOMER':
          router.push('/customer/orders')
          break
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Heading>Loading...</Heading>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={4}>
        <Box textAlign="center">
          <Heading>Location Tracker</Heading>
          <Text mt={2} color="gray.600">
            Real-time location tracking for multivendor delivery platform
          </Text>
        </Box>
      </VStack>
    </Container>
  )
} 