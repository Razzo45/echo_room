'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type SystemConfig = {
  systemName: string;
  version: string;
  features: {
    aiGeneration: boolean;
    badges: boolean;
    analytics: boolean;
  };
  limits: {
    maxEventCodes: number;
    maxRoomsPerEvent: number;
    maxParticipantsPerRoom: number;
  };
};

export default function AdminConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setConfig(data.config);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load config:', err);
      router.push('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-gray-400 hover:text-white mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-white mb-2">System Configuration</h1>
              <p className="text-sm text-gray-400">Configure system settings and preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {config && (
          <div className="space-y-6">
            {/* System Info */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">System Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">System Name</label>
                  <div className="text-white font-semibold">{config.systemName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Version</label>
                  <div className="text-white font-semibold">{config.version}</div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Features</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">AI Generation</span>
                  <span
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      config.features.aiGeneration
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {config.features.aiGeneration ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Badges</span>
                  <span
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      config.features.badges
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {config.features.badges ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Analytics</span>
                  <span
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      config.features.analytics
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {config.features.analytics ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">System Limits</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Max Event Codes</label>
                  <div className="text-white font-semibold">{config.limits.maxEventCodes}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Max Rooms per Event</label>
                  <div className="text-white font-semibold">{config.limits.maxRoomsPerEvent}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Max Participants per Room</label>
                  <div className="text-white font-semibold">{config.limits.maxParticipantsPerRoom}</div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                <strong>Note:</strong> Configuration updates are not yet implemented. This page displays current system settings.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
