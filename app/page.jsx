'use client'
import Image from 'next/image'
import Link from 'next/link'
// import styles from './page.module.css'

import {Box, Button, Card} from '@mui/material'


export default function Home() {
  return (
    <main className='main'>
      <Box 
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100vh'
      >
        <Card sx={{
          padding: '10px',
          maxWidth: '400px'
        }}>
          <Image 
            src='./next.svg'
            alt="Synerift Logo"
            width={500}
            height={500}
          />
          <Link href='/signup'>
            <Button  variant='contained'>Sign Up</Button>
          </Link>
          <Link href='/login'>
            <Button variant='outlined'>Log In</Button>
          </Link>
        </Card>
      </Box>
    </main>
  )
}
