'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    aiBrief: '',
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
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/organiser/dashboard" className="inline-flex items-center min-h-[48px] text-primary-600 hover:text-primary-700 font-semibold text-sm">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-2">Create new event</h1>
          <p className="text-sm text-gray-600 mt-0.5">Set up a new Echo Room event</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8 safe-bottom">
        <form onSubmit={handleSubmit} className="card-elevated space-y-6">
          <div>
            <label className="label">Event name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Smart City Hackathon 2026"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of your event"
              rows={3}
              className="input"
            />
          </div>
          <div>
            <label className="label">AI brief (optional)</label>
            <textarea
              value={formData.aiBrief}
              onChange={(e) => setFormData({ ...formData, aiBrief: e.target.value })}
              placeholder="Describe your event theme, goals, and story beats you have in mind. You can generate rooms with AI after creating the event."
              rows={4}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1.5">You can add or edit this later. AI uses it to generate scenario scripts (five beats per quest, paths A/B/C).</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Start date</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="input"
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
          <div>
            <label className="label">Brand colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.brandColor}
                onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                className="h-11 w-20 border border-gray-300 rounded-xl cursor-pointer"
              />
              <input
                type="text"
                value={formData.brandColor}
                onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                placeholder="#0ea5e9"
                className="input flex-1 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="input"
            />
          </div>
          <div>
            <label className="label">Sponsor logos</label>
            <div className="space-y-2">
              {formData.sponsorLogos.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateSponsorLogo(index, e.target.value)}
                    placeholder="https://example.com/sponsor-logo.png"
                    className="input flex-1"
                  />
                  {formData.sponsorLogos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSponsorLogo(index)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition"
                      aria-label="Remove"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addSponsorLogo} className="text-sm text-primary-600 hover:text-primary-700 font-semibold">
                + Add sponsor logo
              </button>
            </div>
          </div>
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Link href="/organiser/dashboard" className="btn btn-secondary">Cancel</Link>
            <button type="submit" disabled={loading || !formData.name} className="btn btn-primary">
              {loading ? 'Creating…' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
