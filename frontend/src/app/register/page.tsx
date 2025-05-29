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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Fade,
  Slide,
  useTheme,
  alpha,
  Divider,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  SelectChangeEvent
} from '@mui/material'
import { useAuth } from '@/hooks/useAuth'
import NextLink from 'next/link'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import WorkIcon from '@mui/icons-material/Work'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import LoginIcon from '@mui/icons-material/Login'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import StorefrontIcon from '@mui/icons-material/Storefront'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const router = useRouter()
  const { register } = useAuth()
  const theme = useTheme()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name as string]: value }))
    if (name === 'role') {
      setSelectedRole(value as string)
    }
  }

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target
    setFormData(prev => ({ ...prev, [name as string]: value }))
    if (name === 'role') {
      setSelectedRole(value as string)
    }
  }

  const handleRoleCardClick = (role: string) => {
    setFormData(prev => ({ ...prev, role }))
    setSelectedRole(role)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const user = await register(
        formData.email,
        formData.password,
        formData.name,
        formData.role as 'VENDOR' | 'DELIVERY_PARTNER' | 'CUSTOMER'
      )

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
      setError('Registration failed. Please check your information and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const roleOptions = [
    {
      value: 'VENDOR',
      label: 'Vendor',
      icon: <StorefrontIcon />,
      description: 'Manage your store and products',
      color: theme.palette.success.main
    },
    {
      value: 'DELIVERY_PARTNER',
      label: 'Delivery Partner',
      icon: <LocalShippingIcon />,
      description: 'Deliver orders to customers',
      color: theme.palette.warning.main
    },
    {
      value: 'CUSTOMER',
      label: 'Customer',
      icon: <ShoppingCartIcon />,
      description: 'Browse and order products',
      color: theme.palette.info.main
    }
  ]

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
      <Container maxWidth="md">
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
                  Create Your Account
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Join our platform and start your journey
                </Typography>
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

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={4}>
                {/* Left Column - Personal Info */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Fade in={true} timeout={1200}>
                    <Box>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Personal Information
                      </Typography>
                      
                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="name"
                        label="Full Name"
                        name="name"
                        autoComplete="name"
                        autoFocus
                        value={formData.name}
                        onChange={handleChange}
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
                              <PersonIcon 
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
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
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
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
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
                    </Box>
                  </Fade>
                </Grid>

                {/* Right Column - Role Selection */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Fade in={true} timeout={1400}>
                    <Box>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Choose Your Role
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {roleOptions.map((option) => (
                          <Card
                            key={option.value}
                            onClick={() => handleRoleCardClick(option.value)}
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              border: selectedRole === option.value 
                                ? `2px solid ${option.color}`
                                : `2px solid transparent`,
                              background: selectedRole === option.value
                                ? alpha(option.color, 0.1)
                                : theme.palette.background.paper,
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 8px 25px ${alpha(option.color, 0.2)}`,
                                border: `2px solid ${alpha(option.color, 0.5)}`
                              }
                            }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                  sx={{
                                    p: 1,
                                    borderRadius: 2,
                                    background: alpha(option.color, 0.1),
                                    color: option.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {option.icon}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {option.label}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {option.description}
                                  </Typography>
                                </Box>
                                {selectedRole === option.value && (
                                  <Chip
                                    label="Selected"
                                    size="small"
                                    sx={{
                                      backgroundColor: option.color,
                                      color: 'white',
                                      fontWeight: 600
                                    }}
                                  />
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>

                      {/* Hidden Select for form validation */}
                      <FormControl sx={{ display: 'none' }}>
                        <Select
                          name="role"
                          value={formData.role}
                          onChange={handleSelectChange}
                        >
                          {roleOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Fade>
                </Grid>
              </Grid>

              {/* Action Buttons */}
              <Fade in={true} timeout={1600}>
                <Box sx={{ mt: 4 }}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading || !formData.role}
                    startIcon={isLoading ? null : <PersonAddIcon />}
                    sx={{ 
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
                      'Create Account'
                    )}
                  </Button>

                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      or
                    </Typography>
                  </Divider>

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Already have an account?
                    </Typography>
                    
                    <Button
                      component={NextLink}
                      href="/login"
                      variant="outlined"
                      fullWidth
                      startIcon={<LoginIcon />}
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
                      Sign In Instead
                    </Button>
                  </Box>
                </Box>
              </Fade>
            </Box>
          </Paper>
        </Slide>
      </Container>
    </Box>
  )
}