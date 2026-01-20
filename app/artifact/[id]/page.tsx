'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Artifact = {
  id: string;
  htmlContent: string;
  pdfPath: string;
  questName: string;
  createdAt: string;
};

export default function ArtifactPage() {
  const router = useRouter();
  const params = useParams();
  const artifactId = params.id as string;

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
      .catch(() => {
        router.push('/world');
      });
  }, [artifactId, router]);

  if (loading || !artifact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artifact...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/me"
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to My Rooms
          </Link>
          
          <a
            href={artifact.pdfPath}
            download
            className="btn btn-primary"
          >
            Download PDF
          </a>
        </div>

        <div
          className="bg-white shadow-lg rounded-lg"
          dangerouslySetInnerHTML={{ __html: artifact.htmlContent }}
        />
      </div>
    </div>
  );
}
