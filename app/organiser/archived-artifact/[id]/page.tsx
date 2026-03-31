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
      <div className="min-h-screen flex items-center justify-center bg-org-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-300/20 border-t-violet-300 mx-auto mb-4" />
          <p className="text-violet-100/75 text-sm">Loading archived artifact…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-org-bg text-org-text">
      <div className="sticky top-0 z-10 bg-org-surface/95 border-b border-org-border backdrop-blur-md px-4 py-4 flex items-center justify-between safe-bottom">
        <Link
          href="/organiser/insights"
          className="text-violet-300 hover:text-violet-200 font-semibold text-sm min-h-[48px] flex items-center"
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
        className="max-w-4xl mx-auto p-6 my-6 rounded-3xl border border-org-border bg-org-surface overflow-auto shadow-soft"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
