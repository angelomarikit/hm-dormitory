import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="mt-3 text-muted">The page you are looking for is not available.</p>
      <Link to="/" className="mt-6 text-ink hover:text-gold">
        Back to home
      </Link>
    </div>
  )
}
