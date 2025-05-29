'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Link,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Fade,
  Slide,
  useTheme,
  alpha,
  Divider,
  Chip
} from '@mui/material'
import { useAuth } from '@/hooks/useAuth'
import NextLink from 'next/link'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import LoginIcon from '@mui/icons-material/Login'
import PersonAddIcon from '@mui/icons-material/PersonAdd'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { login } = useAuth()
  const theme = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const user = await login(email, password)

      // Redirect based on user role
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
    } catch (error) {
      setError('Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Slide direction="down" in={true} timeout={800}>
          <Paper 
            elevation={24}
            sx={{ 
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.background.paper, 0.85)})`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }
            }}
          >
            {/* Header Section */}
            <Fade in={true} timeout={1000}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box 
                  sx={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                    p: 2,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                  }}
                >
                  <LocationOnIcon 
                    sx={{ 
                      fontSize: 40,
                      color: theme.palette.primary.main,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }} 
                  />
                  <Typography 
                    component="h1" 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    Location Tracker
                  </Typography>
                </Box>

                <Typography 
                  component="h2" 
                  variant="h5" 
                  sx={{ 
                    mb: 1,
                    fontWeight: 600,
                    color: theme.palette.text.primary
                  }}
                >
                  Welcome Back
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Sign in to continue to your dashboard
                </Typography>

                {/* Role Indicators */}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['Vendor', 'Delivery', 'Customer'].map((role) => (
                    <Chip
                      key={role}
                      label={role}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1)
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Fade>

            {/* Error Alert */}
            {error && (
              <Slide direction="down" in={Boolean(error)} timeout={300}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: '1.2rem'
                    }
                  }}
                >
                  {error}
                </Alert>
              </Slide>
            )}

            {/* Login Form */}
            <Fade in={true} timeout={1200}>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
                      },
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                      }
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon 
                          sx={{ 
                            color: theme.palette.primary.main,
                            opacity: 0.7
                          }} 
                        />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
                      },
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                      }
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon 
                          sx={{ 
                            color: theme.palette.primary.main,
                            opacity: 0.7
                          }} 
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{
                            transition: 'transform 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  startIcon={isLoading ? null : <LoginIcon />}
                  sx={{ 
                    mt: 2,
                    mb: 3,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.5)}`,
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                    },
                    '&:active': {
                      transform: 'translateY(0px)'
                    },
                    '&:disabled': {
                      background: theme.palette.action.disabledBackground,
                      transform: 'none',
                      boxShadow: 'none'
                    }
                  }}
                >
                  {isLoading ? (
                    <CircularProgress 
                      size={24} 
                      sx={{ 
                        color: theme.palette.primary.contrastText 
                      }} 
                    />
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    or
                  </Typography>
                </Divider>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Don't have an account?
                  </Typography>
                  
                  <Button
                    component={NextLink}
                    href="/register"
                    variant="outlined"
                    fullWidth
                    startIcon={<PersonAddIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.2)}`
                      }
                    }}
                  >
                    Create New Account
                  </Button>
                </Box>
              </Box>
            </Fade>
          </Paper>
        </Slide>
      </Container>
    </Box>
  )
}