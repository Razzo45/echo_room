'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QuestReviewModal from '@/components/QuestReviewModal';

type EventCode = {
  id: string;
  code: string;
  active: boolean;
  usedCount: number;
  maxUses: number | null;
  createdAt: string;
};

type Event = {
  id: string;
  name: string;
  description: string | null;
  aiBrief: string | null;
  aiGenerationStatus: 'IDLE' | 'GENERATING' | 'DRAFT' | 'READY' | 'FAILED';
  aiGeneratedAt: string | null;
  aiGenerationVersion: string | null;
  startDate: string | null;
  timezone: string;
  brandColor: string;
  logoUrl: string | null;
  eventCodes: EventCode[];
  regions: Array<{
    id: string;
    name: string;
    displayName: string;
    _count: {
      quests: number;
    };
  }>;
  _count: {
    users: number;
    rooms: number;
  };
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [codeCount, setCodeCount] = useState(1);
  const [customCode, setCustomCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [aiBrief, setAiBrief] = useState('');
  const [savingBrief, setSavingBrief] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{
    status: string;
    error?: string;
  } | null>(null);
  const [reviewDraft, setReviewDraft] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  // Poll generation status if generating
  useEffect(() => {
    if (!event || event.aiGenerationStatus !== 'GENERATING') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/organiser/events/${eventId}/generation`);
        const data = await res.json();
        if (data.status !== 'GENERATING') {
          setGenerationStatus({ status: data.status, error: data.generation?.error });
          loadEvent(); // Reload event to get updated quests
        }
      } catch (error) {
        console.error('Poll generation status error:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [event, eventId]);

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/organiser/events/${eventId}`);
      const data = await res.json();

      if (!res.ok) {
        router.push('/organiser/dashboard');
        return;
      }

      setEvent(data.event);
      setAiBrief(data.event.aiBrief || '');
      setLoading(false);
    } catch (error) {
      console.error('Load event error:', error);
      router.push('/organiser/dashboard');
    }
  };

  const generateCodes = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/organiser/events/${eventId}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: codeCount }),
      });

      if (res.ok) {
        await loadEvent();
        setCodeCount(1);
      }
    } catch (error) {
      console.error('Generate codes error:', error);
    }
    setGenerating(false);
  };

  const createCustomCode = async () => {
    if (!customCode.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/organiser/events/${eventId}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCodes: [customCode] }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create custom code');
      } else {
        await loadEvent();
        setCustomCode('');
      }
    } catch (error) {
      console.error('Create custom code error:', error);
      alert('Failed to create custom code');
    }
    setGenerating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleCodeActive = async (codeId: string, active: boolean) => {
    try {
      const res = await fetch(`/api/organiser/events/${eventId}/codes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId, active }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update code state');
        return;
      }
      await loadEvent();
    } catch (error) {
      console.error('Toggle code active error:', error);
      alert('Failed to update code state');
    }
  };

  const copyJoinLink = (code: string) => {
    const baseUrl = window.location.origin;
    const joinLink = `${baseUrl}/?code=${code}`;
    navigator.clipboard.writeText(joinLink);
    setCopiedCode(code + '-link');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const saveAiBrief = async () => {
    setSavingBrief(true);
    try {
      const res = await fetch(`/api/organiser/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiBrief }),
      });

      if (res.ok) {
        await loadEvent();
      }
    } catch (error) {
      console.error('Save AI brief error:', error);
    }
    setSavingBrief(false);
  };

  const generateRooms = async () => {
    if (!aiBrief.trim()) {
      alert('Please enter an AI brief first');
      return;
    }

    setGenerating(true);
    setGenerationStatus({ status: 'GENERATING' });

    try {
      // Save brief first if changed
      if (aiBrief !== event?.aiBrief) {
        await saveAiBrief();
      }

      const res = await fetch(`/api/organiser/events/${eventId}/generate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        // Show detailed error message
        const errorMsg = data.details 
          ? `${data.error || 'Generation failed'}: ${data.details}`
          : data.error || 'Generation failed';
        
        setGenerationStatus({
          status: 'FAILED',
          error: errorMsg,
        });
        setGenerating(false);
        
        // Also update event status if available
        if (event) {
          loadEvent();
        }
        return;
      }

      // If draft is returned, show review modal
      if (data.draft && data.status === 'DRAFT') {
        setReviewDraft(data.draft);
        setShowReviewModal(true);
        setGenerating(false);
        setGenerationStatus({ status: 'DRAFT' });
      } else if (data.status === 'READY') {
        // Already committed
        setGenerationStatus({ status: 'READY' });
        await loadEvent();
        setGenerating(false);
      } else {
        // Start polling for status (shouldn't happen with new flow)
        setGenerationStatus({ status: 'GENERATING' });
      }
    } catch (error) {
      console.error('Generate rooms error:', error);
      setGenerationStatus({
        status: 'FAILED',
        error: 'An error occurred during generation',
      });
      setGenerating(false);
    }
  };

  const handleConfirmReview = async (editedDraft: any) => {
    try {
      setGenerating(true);
      const res = await fetch(`/api/organiser/events/${eventId}/generate/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: editedDraft }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to save content');
        setGenerating(false);
        return;
      }

      // Success - close modal and reload
      setShowReviewModal(false);
      setReviewDraft(null);
      setGenerationStatus({ status: 'READY' });
      await loadEvent();
      setGenerating(false);
    } catch (error) {
      console.error('Commit error:', error);
      alert('An error occurred while saving. Please try again.');
      setGenerating(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Review Modal */}
      {showReviewModal && reviewDraft && (
        <QuestReviewModal
          draft={reviewDraft}
          generationId={''}
          onClose={() => {
            setShowReviewModal(false);
            setReviewDraft(null);
            loadEvent(); // Reload to refresh status
          }}
          onConfirm={handleConfirmReview}
        />
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link
              href="/organiser/dashboard"
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              ← Dashboard
            </Link>
            <div className="flex-1">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                <div
                  className="w-4 h-4 rounded-full ml-3"
                  style={{ backgroundColor: event.brandColor }}
                ></div>
              </div>
              {event.description && (
                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Generation Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Room Generation</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Brief *
              </label>
              <textarea
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
                placeholder="Describe your event theme, goals, and the types of decisions you want participants to make. The AI will generate quests, decisions, and options based on this brief."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={generating || savingBrief}
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: "A smart city hackathon focused on urban sustainability. Teams will make decisions about renewable energy, public transportation, and waste management."
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={saveAiBrief}
                disabled={savingBrief || aiBrief === event?.aiBrief || !aiBrief.trim()}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingBrief ? 'Saving...' : 'Save Brief'}
              </button>
              <button
                onClick={generateRooms}
                disabled={generating || !aiBrief.trim() || event?.aiGenerationStatus === 'GENERATING'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating || event?.aiGenerationStatus === 'GENERATING' ? 'Generating...' : 'Generate Rooms'}
              </button>
            </div>

            {/* Generation Status */}
            {(event?.aiGenerationStatus !== 'IDLE' || generationStatus) && (
              <div className={`p-4 rounded-lg border ${
                event?.aiGenerationStatus === 'READY' || generationStatus?.status === 'READY'
                  ? 'bg-green-50 border-green-200'
                  : event?.aiGenerationStatus === 'GENERATING' || generationStatus?.status === 'GENERATING'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-2">
                    Status:
                  </span>
                  <span className="text-sm">
                    {event?.aiGenerationStatus || generationStatus?.status}
                  </span>
                </div>
                {event?.aiGeneratedAt && (
                  <p className="text-xs text-gray-600 mt-1">
                    Generated: {new Date(event.aiGeneratedAt).toLocaleString()}
                  </p>
                )}
                {generationStatus?.error && (
                  <p className="text-sm text-red-800 mt-2">
                    Error: {generationStatus.error}
                  </p>
                )}
                {event?.aiGenerationStatus === 'READY' && (
                  <p className="text-sm text-green-800 mt-2">
                    ✓ Rooms generated successfully! Participants can now join quests.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Participants</span>
                  <span className="text-2xl font-bold text-gray-900">{event._count.users}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rooms (Active)</span>
                  <span className="text-2xl font-bold text-gray-900">{event._count.rooms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quests</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {event.regions.reduce((sum, r) => sum + r._count.quests, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Event Codes</span>
                  <span className="text-2xl font-bold text-gray-900">{event.eventCodes.length}</span>
                </div>
              </div>
            </div>

            {/* Event Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
              <div className="space-y-3 text-sm">
                {event.startDate && (
                  <div>
                    <span className="text-gray-600">Start Date:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(event.startDate).toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Timezone:</span>
                  <p className="font-medium text-gray-900">{event.timezone}</p>
                </div>
                <div>
                  <span className="text-gray-600">Brand Color:</span>
                  <div className="flex items-center mt-1">
                    <div
                      className="w-6 h-6 rounded border border-gray-300 mr-2"
                      style={{ backgroundColor: event.brandColor }}
                    ></div>
                    <span className="font-mono text-gray-900">{event.brandColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Event Codes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Event Codes</h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={codeCount}
                      onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                    />
                    <button
                      onClick={generateCodes}
                      disabled={generating}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Custom code (e.g. SMARTCITY26)"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={createCustomCode}
                      disabled={generating || !customCode.trim()}
                      className="px-3 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition disabled:opacity-50"
                    >
                      Add Custom
                    </button>
                  </div>
                </div>
              </div>

              {event.eventCodes.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-gray-600 mb-4">No event codes yet</p>
                  <p className="text-sm text-gray-500">Generate codes to allow participants to join</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {event.eventCodes.map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-2xl font-mono font-bold text-gray-900 mr-4">
                            {code.code}
                          </span>
                          {code.active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Used {code.usedCount} time{code.usedCount !== 1 ? 's' : ''}
                          {code.maxUses && ` (max: ${code.maxUses})`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyCode(code.code)}
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition"
                        >
                          {copiedCode === code.code ? '✓ Copied' : 'Copy Code'}
                        </button>
                        <button
                          onClick={() => copyJoinLink(code.code)}
                          className="px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold transition"
                        >
                          {copiedCode === code.code + '-link' ? '✓ Copied Link' : 'Copy Join Link'}
                        </button>
                        <button
                          onClick={() => toggleCodeActive(code.id, !code.active)}
                          className="px-3 py-2 text-sm rounded-lg transition border"
                        >
                          {code.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {event.eventCodes.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">How to Share</h4>
                  <p className="text-sm text-blue-800">
                    Share the <strong>event code</strong> with participants, or use the <strong>join link</strong> to 
                    pre-fill the code. Participants visit {window.location.origin} and enter the code.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
