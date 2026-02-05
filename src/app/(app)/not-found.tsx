import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ marginBottom: '1rem' }}>This page could not be found.</p>
      <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
        Go home
      </Link>
    </div>
  )
}

