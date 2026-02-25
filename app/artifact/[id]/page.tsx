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

  if (loading || !artifact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading artifact…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href={fromInsights ? '/organiser/insights' : '/me'}
          className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {fromInsights ? 'Back to Insights' : 'Back to My Rooms'}
        </Link>

        <div
          className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden [&_*]:max-w-full"
          dangerouslySetInnerHTML={{ __html: artifact.htmlContent }}
        />
      </div>
    </div>
  );
}
