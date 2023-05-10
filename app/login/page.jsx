'use client'
import { Box } from '@mui/material'
import HomeForm from '../components/HomeForm'

export default function signup() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: depends on backend
  }
  return (
    <Box>
      <HomeForm formType='login' handleSubmit={handleSubmit} />
    </Box>
  )
}