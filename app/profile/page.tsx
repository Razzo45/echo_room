'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    organisation: '',
    role: '',
    country: '',
    skill: '',
    curiosity: '',
  });

  useEffect(() => {
    // Check if user already has profile
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user && !data.needsProfile) {
          // Already has profile, prefill
          setFormData({
            name: data.user.name,
            organisation: data.user.organisation,
            role: data.user.role,
            country: data.user.country,
            skill: data.user.skill,
            curiosity: data.user.curiosity,
          });
        }
      })
      .catch(() => {
        // Not authenticated, redirect to landing
        router.push('/');
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save profile');
        setLoading(false);
        return;
      }

      router.push('/world');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Profile
          </h1>
          <p className="text-gray-600">
            Tell us about yourself to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label className="label">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="label">Organisation *</label>
            <input
              type="text"
              name="organisation"
              value={formData.organisation}
              onChange={handleChange}
              className="input"
              required
              placeholder="Company or institution"
            />
          </div>

          <div>
            <label className="label">Role *</label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input"
              required
              placeholder="Your job title or position"
            />
          </div>

          <div>
            <label className="label">Country *</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="input"
              required
              placeholder="Where are you based?"
            />
          </div>

          <div>
            <label className="label">One Skill *</label>
            <input
              type="text"
              name="skill"
              value={formData.skill}
              onChange={handleChange}
              className="input"
              required
              placeholder="A key skill you bring to the table"
            />
          </div>

          <div>
            <label className="label">One Curiosity *</label>
            <textarea
              name="curiosity"
              value={formData.curiosity}
              onChange={handleChange}
              className="input"
              required
              rows={3}
              maxLength={200}
              placeholder="What are you most curious about in smart cities or AI? (max 200 characters)"
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.curiosity.length}/200 characters
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Saving...' : 'Continue to World Map'}
          </button>
        </form>
      </div>
    </div>
  );
}
