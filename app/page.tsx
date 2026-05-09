import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">DevBoard</h1>
        <p className="text-gray-600 mb-8">
          Self-hosted observability platform for logs, metrics, and traces.
        </p>
        <div className="space-y-4">
          <Link
            href="/logs"
            className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            View Logs
          </Link>
          <Link
          target="_blank"
            href="/docs"
            className="block w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            API Documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
