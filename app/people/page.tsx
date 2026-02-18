'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Person = {
  id: string;
  name: string;
  organisation: string;
  role: string;
  headline: string | null;
  linkedinUrl: string | null;
};

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [levelLabel, setLevelLabel] = useState<string | null>(null);
  const [neighbours, setNeighbours] = useState<Array<{ name: string; agreementPercent: number }>>([]);
  const [collabStats, setCollabStats] = useState<{ uniqueCollaborators: number; countriesCollaborated: number } | null>(null);

  const fetchPeople = useCallback(async (q: string) => {
    const url = q.trim()
      ? `/api/people?q=${encodeURIComponent(q.trim())}`
      : '/api/people';
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.people) {
      setPeople(data.people);
    } else {
      setPeople([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/me').then((r) => r.json()),
      fetch('/api/people/neighbours').then((r) => r.json()),
    ])
      .then(([authData, meData, neighData]) => {
        if (authData.error || authData.needsProfile) {
          router.push(authData.needsProfile ? '/profile' : '/');
          return;
        }
        if (meData.levelLabel) setLevelLabel(meData.levelLabel);
        if (neighData.neighbours) {
          setNeighbours(neighData.neighbours.map((n: { name: string; agreementPercent: number }) => ({ name: n.name, agreementPercent: n.agreementPercent })));
        }
        if (neighData.stats) setCollabStats(neighData.stats);
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  useEffect(() => {
    if (loading) return;
    fetchPeople(search);
  }, [loading, search, fetchPeople]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/world"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to World Map
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">People</h1>
          <p className="text-gray-600">
            Find other participants who have chosen to appear in the directory. Only people who opted in are shown.
          </p>
          {levelLabel && (
            <p className="text-sm text-indigo-600 font-medium mt-1">
              Your level: {levelLabel}
            </p>
          )}
          {collabStats && (collabStats.uniqueCollaborators > 0 || collabStats.countriesCollaborated > 0) && (
            <div className="mt-3 p-3 rounded-lg bg-gray-100 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Your collaboration</p>
              <p className="text-sm text-gray-700">
                You&apos;ve worked with {collabStats.uniqueCollaborators} unique professional{collabStats.uniqueCollaborators !== 1 ? 's' : ''}
                {collabStats.countriesCollaborated > 0 && (
                  <> across {collabStats.countriesCollaborated} countr{collabStats.countriesCollaborated !== 1 ? 'ies' : 'y'}</>
                )}.
              </p>
            </div>
          )}
          {neighbours.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-1">Decision Neighbours</p>
              <p className="text-sm text-indigo-700 mb-1">You aligned most with:</p>
              <ul className="text-sm text-indigo-800 font-medium">
                {neighbours.slice(0, 5).map((n, i) => (
                  <li key={i}>{n.name} ({n.agreementPercent}% agreement)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, organisation, role, or headline..."
              className="input flex-1"
              maxLength={100}
            />
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Search
            </button>
          </div>
        </form>

        {people.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-2">
              {search
                ? 'No one matches your search.'
                : 'No one has opted in to the directory yet.'}
            </p>
            <p className="text-sm text-gray-500">
              {search
                ? 'Try a different search or clear the search box.'
                : 'You can make yourself discoverable in your profile settings.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {people.map((person) => (
              <li key={person.id}>
                <div className="card hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {person.name}
                    </h2>
                    {person.headline && (
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                        {person.headline}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {person.role} at {person.organisation}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {person.linkedinUrl && (
                      <a
                        href={person.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0A66C2] bg-[#0A66C2]/10 rounded-lg hover:bg-[#0A66C2]/20 transition"
                      >
                        <LinkedInIcon className="w-5 h-5" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-sm text-gray-500 text-center">
          To show or hide yourself here, go to your{' '}
          <Link href="/profile" className="text-primary-600 hover:underline">
            profile
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
