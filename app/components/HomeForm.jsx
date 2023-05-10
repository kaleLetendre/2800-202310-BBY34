'use client'
import Link from 'next/link'
import { TextField, Button } from '@mui/material'

export default function HomeForm({formType, handleSubmit}) {
  return (
    <form onSubmit={handleSubmit}>
      <TextField 
        name='username'
        type='text'
        placeholder='Username'
        variant='outlined'
      />
      {formType == 'signup' &&       <TextField
        name='email'
        type='email'
        placeholder='Email'
        variant='outlined'
      />}
      <TextField 
        name='password'
        type='text'
        placeholder='Password'
        variant='outlined'
      />
      <Link href='/'>
       <Button variant='outlined' type='submit'>
        Back
        </Button>
      </Link>
      <Button variant='contained' type='submit'>
        Submit
      </Button>
    </form>
  )
}