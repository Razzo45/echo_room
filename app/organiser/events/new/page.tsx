'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    timezone: 'UTC',
    brandColor: '#0ea5e9',
    logoUrl: '',
    sponsorLogos: [''],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sponsorLogos = formData.sponsorLogos.filter(url => url.trim());
      
      const res = await fetch('/api/organiser/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sponsorLogos: sponsorLogos.length > 0 ? sponsorLogos : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create event');
        setLoading(false);
        return;
      }

      router.push(`/organiser/events/${data.event.id}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const addSponsorLogo = () => {
    setFormData({
      ...formData,
      sponsorLogos: [...formData.sponsorLogos, ''],
    });
  };

  const removeSponsorLogo = (index: number) => {
    setFormData({
      ...formData,
      sponsorLogos: formData.sponsorLogos.filter((_, i) => i !== index),
    });
  };

  const updateSponsorLogo = (index: number, value: string) => {
    const updated = [...formData.sponsorLogos];
    updated[index] = value;
    setFormData({ ...formData, sponsorLogos: updated });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link
              href="/organiser/dashboard"
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
              <p className="text-sm text-gray-600 mt-1">Set up a new Echo Room event</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onsubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="space-y-6">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Smart City Hackathon 2026"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of your event"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Start Date & Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Singapore">Singapore</option>
                </select>
              </div>
            </div>

            {/* Brand Color */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Brand Color
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={formData.brandColor}
                  onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                  className="h-12 w-24 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.brandColor}
                  onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                  placeholder="#0ea5e9"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Sponsor Logos */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sponsor Logos
              </label>
              <div className="space-y-3">
                {formData.sponsorLogos.map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateSponsorLogo(index, e.target.value)}
                      placeholder="https://example.com/sponsor-logo.png"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {formData.sponsorLogos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSponsorLogo(index)}
                        className="px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSponsorLogo}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  + Add Sponsor Logo
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/organiser/dashboard"
                className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !formData.name}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
