'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
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

          <p className="mt-4 text-xs text-gray-500 text-center">
            By clicking <span className="font-medium">Continue to World Map</span>, you agree to our{' '}
            <button
              type="button"
              className="underline text-gray-700 hover:text-gray-900"
              onClick={() => setShowTerms(true)}
            >
              terms of use and data retention policy
            </button>
            .
          </p>
        </form>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white max-w-2xl w-full mx-4 max-h-[80vh] rounded-xl shadow-lg flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Terms of Use & Data Retention
              </h2>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 text-sm"
                onClick={() => setShowTerms(false)}
              >
                Close
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto text-sm text-gray-700 space-y-3">
              <p>
                Echo Room is an event-based decision experience. When you create a profile,
                we collect the information you provide on this screen (name, organisation,
                role, country, one skill, and one curiosity) so that we can run the
                experience, form teams, and generate anonymised insights about participation.
              </p>
              <p>
                Your profile is linked to your participation in rooms (teams), votes,
                and any decision artifacts generated during the event. This information is
                used to operate the session in real time, to support facilitator and
                organiser insights, and to help us understand how the experience is used.
              </p>
              <p>
                We do not sell your personal data. Your data may be processed by our
                technical providers (for example hosting, analytics, and email
                infrastructure) only to the extent necessary to provide this service.
                Where possible, analytics and reporting are aggregated or anonymised.
              </p>
              <p>
                We store your profile and related participation data for the lifetime of
                the event and for a limited period afterwards so that organisers can review
                outcomes. You can delete your data at any time via the participant settings
                page; this will remove your profile, room memberships, and votes from the
                live system. Some aggregate or anonymised statistics may be retained but
                will no longer be linked to you personally.
              </p>
              <p>
                Our lawful bases for processing include your consent (by creating a profile
                and taking part in the experience) and the legitimate interests of the
                event organiser in running and improving the event. If you have questions
                about how your data is used, or would like to exercise GDPR rights such as
                access, correction, or deletion, please contact the organiser of this
                event or the admin contact provided with your event invitation.
              </p>
            </div>
            <div className="px-6 py-3 border-t flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowTerms(false)}
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
