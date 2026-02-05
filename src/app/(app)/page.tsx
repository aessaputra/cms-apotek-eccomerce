
export default function Page() {
    return (
        <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>CMS Apotek E-commerce</h1>
            <p>Headless CMS Running.</p>
            <p><a href="/admin" style={{ color: 'blue', textDecoration: 'underline' }}>Go to Admin Panel</a></p>
        </div>
    )
}
