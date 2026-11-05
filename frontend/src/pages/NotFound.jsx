import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-7xl font-extrabold tracking-tight text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-navy-900">This page does not exist</h1>
      <p className="mt-2 max-w-sm text-navy-500">The link may be broken, or the page may have been moved.</p>
      <Link to="/" className="btn-primary mt-8">Go to dashboard</Link>
    </main>
  );
}
