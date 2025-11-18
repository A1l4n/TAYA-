'use client';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          TAYA ERP Platform
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Multi-tenant ERP platform with hierarchical management
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Authentication and dashboard components coming soon...
        </p>
      </div>
    </div>
  );
}

