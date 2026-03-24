'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    organisation: '',
    role: '',
    country: '',
    skill: '',
    curiosity: '',
    headline: '',
    linkedinUrl: '',
    isDiscoverable: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [levelLabel, setLevelLabel] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user && !data.needsProfile) {
          setIsEditing(true);
          if (data.user.profileUpdatedAt) setProfileUpdatedAt(data.user.profileUpdatedAt);
          if (data.user.levelLabel) setLevelLabel(data.user.levelLabel);
          setFormData({
            name: data.user.name,
            organisation: data.user.organisation,
            role: data.user.role,
            country: data.user.country,
            skill: data.user.skill,
            curiosity: data.user.curiosity,
            headline: data.user.headline ?? '',
            linkedinUrl: data.user.linkedinUrl ?? '',
            isDiscoverable: data.user.isDiscoverable ?? false,
          });
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSaveSuccess(false);
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
      setIsEditing(true);
      if (data.user?.profileUpdatedAt) setProfileUpdatedAt(data.user.profileUpdatedAt);
      setSaveSuccess(true);
      if (!isEditing) router.push('/world');
      else setLoading(false);
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    if (saveSuccess) setSaveSuccess(false);
  };

  const handleLogout = async () => {
    setAccountError('');
    setLogoutLoading(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAccountError((data as { error?: string }).error || 'Could not log out.');
        setLogoutLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setAccountError('Could not log out. Try again.');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    setAccountError('');
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/data/delete', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAccountError((data as { error?: string }).error || 'Could not delete your data.');
        setDeleteLoading(false);
        setShowDeleteConfirm(false);
        return;
      }
      setShowDeleteConfirm(false);
      router.push('/');
      router.refresh();
    } catch {
      setAccountError('Could not delete your data. Try again.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/world" className="p-2 -ml-2 rounded-xl text-primary-600 hover:bg-primary-50 flex items-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1">
          {isEditing ? 'Edit profile' : 'Create profile'}
        </h1>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-4">
        <p className="text-gray-500 text-sm mb-4">
            {isEditing ? 'Update your details anytime.' : 'Tell us about yourself to get started.'}
        </p>
        {isEditing && profileUpdatedAt && (
            <p className="mt-2 text-xs text-gray-500">
              Last updated: {new Date(profileUpdatedAt).toLocaleString()}
            </p>
          )}
        {isEditing && levelLabel && (
          <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            Level: {levelLabel}
          </span>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 space-y-5">
          {saveSuccess && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 font-medium">
              Profile updated successfully.
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input" required placeholder="Your full name" />
            </div>
            <div>
              <label className="label">Organisation *</label>
              <input type="text" name="organisation" value={formData.organisation} onChange={handleChange} className="input" required placeholder="Company or institution" />
            </div>
            <div>
              <label className="label">Role *</label>
              <input type="text" name="role" value={formData.role} onChange={handleChange} className="input" required placeholder="Job title or position" />
            </div>
          </div>

          <p className="text-xs text-gray-500 -mt-2">
            When you turn on <span className="font-medium text-gray-700">Show me in the People directory</span>, your name, organisation, role, headline and LinkedIn (if provided) are visible to other participants.
          </p>

          <div>
            <label className="label">Country *</label>
            <input type="text" name="country" value={formData.country} onChange={handleChange} className="input" required placeholder="Where are you based?" />
            <p className="mt-1.5 text-xs text-gray-500">Used for organiser insights only; not shown in the People directory.</p>
          </div>

          <div>
            <label className="label">One skill *</label>
            <input type="text" name="skill" value={formData.skill} onChange={handleChange} className="input" required placeholder="A key skill you bring" />
            <p className="mt-1.5 text-xs text-gray-500">Used to understand team composition; not shown in the People directory.</p>
          </div>

          <div>
            <label className="label">One curiosity *</label>
            <textarea name="curiosity" value={formData.curiosity} onChange={handleChange} className="input min-h-[88px]" required rows={3} maxLength={200} placeholder="What are you most curious about in smart cities or AI? (max 200 characters)" />
            <p className="mt-1.5 text-sm text-gray-500">{formData.curiosity.length}/200</p>
            <p className="mt-0.5 text-xs text-gray-500">Used internally for facilitation and insights; not shown to other participants.</p>
          </div>

          <div>
            <label className="label">Headline (optional)</label>
            <input type="text" name="headline" value={formData.headline} onChange={handleChange} className="input" maxLength={120} placeholder="e.g. Sustainability lead at Acme Corp" />
            <p className="mt-1.5 text-sm text-gray-500">Short tagline in People directory. {formData.headline.length}/120</p>
          </div>

          <div>
            <label className="label">LinkedIn profile URL (optional)</label>
            <input type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange} className="input" placeholder="https://linkedin.com/in/yourprofile" />
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <input type="checkbox" id="isDiscoverable" name="isDiscoverable" checked={formData.isDiscoverable} onChange={handleChange} className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
            <div>
              <label htmlFor="isDiscoverable" className="text-sm font-medium text-gray-900 cursor-pointer">Show me in the People directory (networking search)</label>
              <p className="text-xs text-gray-500 mt-0.5">Only people who turn this on appear on the People page. You control your visibility.</p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full text-base">
            {loading ? 'Saving…' : isEditing ? 'Save changes' : 'Continue to World Map'}
          </button>

          <p className="text-xs text-gray-500 text-center pt-2">
            {isEditing ? (
              <Link href="/world" className="text-primary-600 hover:text-primary-700 font-medium">
                ← Back to World Map
              </Link>
            ) : (
              <>
                By clicking <span className="font-medium">Continue to World Map</span>, you agree to our{' '}
                <button type="button" className="underline text-gray-700 hover:text-gray-900" onClick={() => setShowTerms(true)}>
                  terms of use and data retention policy
                </button>
                .
              </>
            )}
          </p>
        </form>

        <div className="mt-6 bg-white rounded-3xl shadow border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Account</h2>
          {accountError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-800">{accountError}</div>
          )}
          <p className="text-xs text-gray-500">
            Log out ends your session on this device. Deleting your data permanently removes your profile and related activity for this event (rooms, votes, badges, and sessions), then logs you out.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading || deleteLoading}
              className="btn border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 w-full sm:flex-1 disabled:opacity-50"
            >
              {logoutLoading ? 'Logging out…' : 'Log out'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountError('');
                setShowDeleteConfirm(true);
              }}
              disabled={logoutLoading || deleteLoading}
              className="btn border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 w-full sm:flex-1 disabled:opacity-50"
            >
              Delete all my data
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Delete all your data?</h2>
            </div>
            <div className="px-6 py-4 text-sm text-gray-700 space-y-3">
              <p className="font-medium text-gray-900">Are you sure?</p>
              <p>
                This will permanently delete your profile, session, room memberships, votes, badges, and other activity
                linked to your account for this event. You will be logged out. This cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                className="btn border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 w-full sm:w-auto"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn bg-red-600 text-white hover:bg-red-700 w-full sm:w-auto disabled:opacity-50"
                onClick={handleDeleteAllData}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting…' : 'Yes, delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowTerms(false)}>
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Terms of use & data retention</h2>
              <button type="button" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700" onClick={() => setShowTerms(false)} aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto text-sm text-gray-700 space-y-4">
              <p>Echo Room is an event-based decision experience. When you create a profile, we collect the information you provide (name, organisation, role, country, one skill, one curiosity) to run the experience, form teams, and generate anonymised insights.</p>
              <p>Your profile is linked to your participation in rooms, votes, and decision artifacts. This is used to operate the session, support facilitator and organiser insights, and improve the experience.</p>
              <p>We do not sell your personal data. Data may be processed by our technical providers only as necessary to provide this service. Where possible, analytics and reporting are aggregated or anonymised.</p>
              <p>We store your profile and participation data for the event and a limited period afterwards. You can delete your data at any time from your profile page (Delete all my data).</p>
              <p>If you have questions or wish to exercise GDPR rights (access, correction, deletion), contact the event organiser or the admin contact provided with your invitation.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 shrink-0">
              <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => setShowTerms(false)}>I understand</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
