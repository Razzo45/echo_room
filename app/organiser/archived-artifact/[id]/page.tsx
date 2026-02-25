'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function OrganiserArchivedArtifactPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/organiser/archived-artifact/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push('/organiser/insights');
          return;
        }
        setHtmlContent(data.htmlContent ?? null);
        setLoading(false);
      })
      .catch(() => {
        router.push('/organiser/insights');
      });
  }, [id, router]);

  const handlePrint = () => {
    if (!htmlContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to open the print view.');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  if (loading || htmlContent === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading archived artifact…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-4 py-4 flex items-center justify-between safe-bottom">
        <Link
          href="/organiser/insights"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm min-h-[48px] flex items-center"
        >
          ← Back to Insights
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="btn btn-primary"
        >
          Print / Save as PDF
        </button>
      </div>
      <div
        className="max-w-4xl mx-auto p-6 my-6 card-elevated overflow-auto rounded-3xl"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
