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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

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
    const url = q.trim() ? `/api/people?q=${encodeURIComponent(q.trim())}` : '/api/people';
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.people) setPeople(data.people);
    else setPeople([]);
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/world" className="p-2 -ml-2 rounded-xl text-primary-600 hover:bg-primary-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">World</span>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1">People</h1>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4">
        <p className="text-sm text-gray-500 mb-3">Find participants who opted into the directory.</p>
        {levelLabel && (
          <span className="inline-flex items-center mb-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            Level: {levelLabel}
          </span>
        )}
        {collabStats && (collabStats.uniqueCollaborators > 0 || collabStats.countriesCollaborated > 0) && (
          <div className="mb-3 p-3 rounded-2xl bg-gray-100 text-sm text-gray-700">
            You’ve worked with {collabStats.uniqueCollaborators} professional{collabStats.uniqueCollaborators !== 1 ? 's' : ''}
            {collabStats.countriesCollaborated > 0 && <> in {collabStats.countriesCollaborated} countr{collabStats.countriesCollaborated !== 1 ? 'ies' : 'y'}</>}.
          </div>
        )}
        {neighbours.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-primary-50 border border-primary-200">
            <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Decision neighbours</p>
            <p className="text-sm text-primary-800">
              {neighbours.slice(0, 3).map((n, i) => (
                <span key={i}>{n.name} ({n.agreementPercent}%){i < Math.min(2, neighbours.length - 1) ? ', ' : ''}</span>
              ))}
            </p>
          </div>
        )}

        <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name, org, role…"
            className="input flex-1 min-h-[48px]"
            maxLength={100}
          />
          <button type="submit" className="btn btn-primary shrink-0">Search</button>
        </form>

        {people.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center">
            <p className="text-gray-500">
              {search ? 'No matches.' : 'No one in the directory yet.'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Try another search.' : 'Opt in from your profile.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {people.map((person) => (
              <li key={person.id}>
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg shrink-0">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">{person.name}</p>
                    {person.headline && <p className="text-sm text-gray-600 line-clamp-1">{person.headline}</p>}
                    <p className="text-xs text-gray-500">{person.role} at {person.organisation}</p>
                  </div>
                  {person.linkedinUrl && (
                    <a
                      href={person.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-2 rounded-xl bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20"
                      aria-label="LinkedIn"
                    >
                      <LinkedInIcon className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/profile" className="text-primary-600 font-medium">Profile</Link> to show or hide yourself here.
        </p>
      </main>
    </div>
  );
}
