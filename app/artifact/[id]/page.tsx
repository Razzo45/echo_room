'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Artifact = {
  id: string;
  htmlContent: string;
  questName: string;
  createdAt: string;
};

export default function ArtifactPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const artifactId = params.id as string;
  const fromInsights = searchParams.get('from') === 'insights';

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/artifact/${artifactId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push('/world');
          return;
        }
        setArtifact(data.artifact);
        setLoading(false);
      })
      .catch(() => router.push('/world'));
  }, [artifactId, router]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading || !artifact) {
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
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href={fromInsights ? '/organiser/insights' : '/me'}
          className="p-2 -ml-2 rounded-xl text-primary-600 hover:bg-primary-50 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">{fromInsights ? 'Insights' : 'My Rooms'}</span>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1 pr-4">Decision map</h1>
        <button
          type="button"
          onClick={handlePrint}
          className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border border-primary-500 text-primary-600 hover:bg-primary-50"
        >
          Save as PDF
        </button>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4">
        <div
          className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden [&_*]:max-w-full"
          dangerouslySetInnerHTML={{ __html: artifact.htmlContent }}
        />
      </div>
    </div>
  );
}
