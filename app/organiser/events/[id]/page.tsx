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
  debugMode: boolean;
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
    quests?: Array<{
      id: string;
      name: string;
      _count: { rooms: number };
    }>;
    _count: {
      quests: number;
    };
  }>;
  _count: {
    users: number;
    rooms: number;
  };
};

type ScenarioSlots = {
  eventType: string;
  audienceType: string;
  toneMood: string;
  playfulnessLevel: string;
  endingFeel: string;
  outputStyle: string;
  gameplayFeel: string;
  themesMotifs: string;
  constraints: string;
  brandContext: string;
  forbiddenDirections: string;
  customNotes: string;
};

const DEFAULT_SCENARIO_SLOTS: ScenarioSlots = {
  eventType: '',
  audienceType: '',
  toneMood: '',
  playfulnessLevel: '',
  endingFeel: '',
  outputStyle: '',
  gameplayFeel: '',
  themesMotifs: '',
  constraints: '',
  brandContext: '',
  forbiddenDirections: '',
  customNotes: '',
};

function buildScenarioBrief(slots: ScenarioSlots): string {
  return [
    'Scenario generation slots:',
    `- Event type: ${slots.eventType || 'Not specified'}`,
    `- Audience type: ${slots.audienceType || 'Not specified'}`,
    `- Tone/mood: ${slots.toneMood || 'Not specified'}`,
    `- Playfulness level: ${slots.playfulnessLevel || 'Not specified'}`,
    `- Desired ending feel: ${slots.endingFeel || 'Not specified'}`,
    `- Output style: ${slots.outputStyle || 'Not specified'}`,
    `- Gameplay feel: ${slots.gameplayFeel || 'Not specified'}`,
    `- Themes/motifs: ${slots.themesMotifs || 'Not specified'}`,
    `- Constraints: ${slots.constraints || 'None'}`,
    `- Brand context: ${slots.brandContext || 'None'}`,
    `- Forbidden tones/directions: ${slots.forbiddenDirections || 'None'}`,
    `- Custom notes: ${slots.customNotes || 'None'}`,
    '',
    'Generate a 3-beat collaborative storytelling scenario suitable for live multiplayer play.',
  ].join('\n');
}

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
  const [scenarioSlots, setScenarioSlots] = useState<ScenarioSlots>(DEFAULT_SCENARIO_SLOTS);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [deletingQuestId, setDeletingQuestId] = useState<string | null>(null);
  const [deletingRegionId, setDeletingRegionId] = useState<string | null>(null);
  const [deletingDistrictId, setDeletingDistrictId] = useState<string | null>(null);

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

  const updateScenarioSlot = (key: keyof ScenarioSlots, value: string) => {
    setScenarioSlots((prev) => ({ ...prev, [key]: value }));
  };

  const applyScenarioSlotsToBrief = () => {
    setAiBrief(buildScenarioBrief(scenarioSlots));
  };

  const deleteQuest = async (quest: { id: string; name: string; _count?: { rooms: number } }) => {
    const roomCount = quest._count?.rooms ?? 0;
    if (roomCount > 0) {
      alert(`This quest has ${roomCount} room(s). Remove or complete them before deleting the quest.`);
      return;
    }
    if (!confirm(`Delete quest "${quest.name}"? This cannot be undone.`)) return;
    setDeletingQuestId(quest.id);
    try {
      const res = await fetch(`/api/organiser/quests/${quest.id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadEvent();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete quest.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete quest.');
    }
    setDeletingQuestId(null);
  };

  const deleteRegionQuestsWithNoRooms = async (region: { id: string; displayName: string; quests?: Array<{ id: string; name: string; _count?: { rooms: number } }> }) => {
    const quests = region.quests ?? [];
    const safeToDelete = quests.filter((q) => (q._count?.rooms ?? 0) === 0);
    if (safeToDelete.length === 0) {
      alert('No quests in this district can be deleted (all have active rooms).');
      return;
    }
    if (!confirm(`Delete ${safeToDelete.length} quest(s) in "${region.displayName}"? This cannot be undone.`)) return;
    setDeletingRegionId(region.id);
    try {
      let failed = 0;
      for (const quest of safeToDelete) {
        const res = await fetch(`/api/organiser/quests/${quest.id}`, { method: 'DELETE' });
        if (!res.ok) failed++;
      }
      await loadEvent();
      if (failed > 0) alert(`${failed} delete(s) failed.`);
    } catch (e) {
      console.error(e);
      alert('Something went wrong while deleting.');
    }
    setDeletingRegionId(null);
  };

  const removeDistrict = async (region: { id: string; displayName: string; _count: { quests: number } }) => {
    if (region._count.quests > 0) {
      alert('Remove or delete all quests in this district first.');
      return;
    }
    if (!confirm(`Remove district "${region.displayName}"? This cannot be undone.`)) return;
    setDeletingDistrictId(region.id);
    try {
      const res = await fetch(`/api/organiser/districts/${region.id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadEvent();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to remove district.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to remove district.');
    }
    setDeletingDistrictId(null);
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

  const deleteCode = async (codeId: string, usedCount: number) => {
    if (usedCount > 0) {
      alert('This code has already been used. Deactivate it instead of deleting.');
      return;
    }
    if (!confirm('Delete this code permanently? It cannot be restored.')) {
      return;
    }
    try {
      const res = await fetch(`/api/organiser/events/${eventId}/codes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete code');
        return;
      }
      await loadEvent();
    } catch (error) {
      console.error('Delete code error:', error);
      alert('Failed to delete code');
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

  const startGenerateRooms = () => {
    if (!aiBrief.trim()) {
      alert('Please enter an AI brief first');
      return;
    }
    const hasExistingContent =
      event?.aiGenerationStatus === 'READY' ||
      (event?.regions && event.regions.length > 0);
    if (hasExistingContent) {
      setShowGenerateConfirm(true);
      return;
    }
    generateRooms();
  };

  const generateRooms = async () => {
    setShowGenerateConfirm(false);
    if (!aiBrief.trim()) return;

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
        const detailText =
          typeof data.details === 'string'
            ? data.details
            : Array.isArray(data.details)
            ? data.details.map((d: any) => (typeof d?.message === 'string' ? d.message : JSON.stringify(d))).join('; ')
            : '';
        alert(detailText ? `${data.error || 'Failed to save content'}\n\n${detailText}` : data.error || 'Failed to save content');
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {event.debugMode && (
        <div className="sticky top-0 left-0 right-0 z-50 flex items-center justify-center py-1.5 px-4 text-sm font-medium bg-amber-500 text-black" role="status" aria-label="Debug mode">
          Debug mode
        </div>
      )}
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
      {/* Re-generate confirmation */}
      {showGenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card-elevated max-w-md w-full p-6 rounded-3xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Re-generate rooms?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to re-generate new rooms? All content generated up until now will be lost and replaced with the newest version. If you want to keep it, you can always modify the content manually on a per room/quest basis.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowGenerateConfirm(false)}
                className="btn btn-secondary"
              >
                No – go back to page and no generation
              </button>
              <button
                type="button"
                onClick={() => generateRooms()}
                className="btn btn-primary"
              >
                Yes – go forward
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Generating overlay – locks panel until draft is ready */}
      {generating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="card-elevated max-w-md w-full p-8 text-center rounded-3xl">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating rooms</h3>
            <p className="text-gray-600 text-sm mb-4">
              This may take a moment. When ready you can review and edit the AI content from this panel (AI content modification).
            </p>
            {generationStatus?.error && (
              <p className="text-sm text-red-600 mt-2">{generationStatus.error}</p>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/organiser/dashboard"
              className="text-primary-600 hover:text-primary-700 font-semibold text-sm shrink-0"
            >
              ← Dashboard
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{event.name}</h1>
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: event.brandColor }}
                  aria-hidden
                />
              </div>
              {event.description && (
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">{event.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8 safe-bottom">
        {/* AI Generation Section */}
        <div className="card-elevated mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Room Generation</h3>
          
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-gray-200 p-4 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Structured scenario setup</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="input" placeholder="Event type (e.g. community night)" value={scenarioSlots.eventType} onChange={(e) => updateScenarioSlot('eventType', e.target.value)} />
                <input className="input" placeholder="Audience type" value={scenarioSlots.audienceType} onChange={(e) => updateScenarioSlot('audienceType', e.target.value)} />
                <input className="input" placeholder="Tone / mood" value={scenarioSlots.toneMood} onChange={(e) => updateScenarioSlot('toneMood', e.target.value)} />
                <input className="input" placeholder="Playfulness level" value={scenarioSlots.playfulnessLevel} onChange={(e) => updateScenarioSlot('playfulnessLevel', e.target.value)} />
                <input className="input" placeholder="Desired ending feel" value={scenarioSlots.endingFeel} onChange={(e) => updateScenarioSlot('endingFeel', e.target.value)} />
                <input className="input" placeholder="Output style (artifact style)" value={scenarioSlots.outputStyle} onChange={(e) => updateScenarioSlot('outputStyle', e.target.value)} />
                <input className="input" placeholder="Gameplay feel" value={scenarioSlots.gameplayFeel} onChange={(e) => updateScenarioSlot('gameplayFeel', e.target.value)} />
                <input className="input" placeholder="Themes / motifs" value={scenarioSlots.themesMotifs} onChange={(e) => updateScenarioSlot('themesMotifs', e.target.value)} />
                <input className="input" placeholder="Constraints" value={scenarioSlots.constraints} onChange={(e) => updateScenarioSlot('constraints', e.target.value)} />
                <input className="input" placeholder="Brand context" value={scenarioSlots.brandContext} onChange={(e) => updateScenarioSlot('brandContext', e.target.value)} />
                <input className="input md:col-span-2" placeholder="Forbidden tones / directions" value={scenarioSlots.forbiddenDirections} onChange={(e) => updateScenarioSlot('forbiddenDirections', e.target.value)} />
                <textarea className="input md:col-span-2 min-h-[90px]" placeholder="Custom notes" value={scenarioSlots.customNotes} onChange={(e) => updateScenarioSlot('customNotes', e.target.value)} />
              </div>
              <button type="button" onClick={applyScenarioSlotsToBrief} className="btn btn-secondary mt-3">
                Assemble prompt into AI brief
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Brief *
              </label>
              <textarea
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
                placeholder="Describe your event theme, goals, and the story tension you want (e.g. tradeoffs, stakes). The AI will generate scenario scripts with three story beats and paths (A/B/C) for each beat—live play is blind actions plus d20 resolution."
                rows={4}
                className="input resize-y"
                disabled={generating || savingBrief}
              />
              <p className="text-xs text-gray-500 mt-1">
                You can type freeform, or use structured scenario setup and then assemble into this brief.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={saveAiBrief}
                disabled={savingBrief || aiBrief === event?.aiBrief || !aiBrief.trim()}
                className="btn btn-secondary"
              >
                {savingBrief ? 'Saving...' : 'Save Brief'}
              </button>
              <button
                onClick={startGenerateRooms}
                disabled={generating || !aiBrief.trim() || event?.aiGenerationStatus === 'GENERATING'}
                className="btn btn-primary"
              >
                {generating || event?.aiGenerationStatus === 'GENERATING' ? 'Generating...' : 'Generate Rooms'}
              </button>
            </div>

            {/* Generation Status */}
            {(event?.aiGenerationStatus !== 'IDLE' || generationStatus) && (
              <div className={`p-4 rounded-2xl border-2 ${
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
            <div className="card-elevated">
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
            <div className="card-elevated">
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

          {/* Right Column - Event Codes & Quests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Codes */}
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Event Codes</h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={codeCount}
                      onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
                      className="input w-20 text-center"
                    />
                    <button
                      onClick={generateCodes}
                      disabled={generating}
                      className="btn btn-primary"
                    >
                      {generating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Custom code (e.g. SMARTCITY26)"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      className="input flex-1 min-w-[140px]"
                    />
                    <button
                      onClick={createCustomCode}
                      disabled={generating || !customCode.trim()}
                      className="btn btn-secondary"
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
                      className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-200"
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
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => copyCode(code.code)}
                          type="button"
                          className="btn btn-ghost text-sm min-h-[44px]"
                        >
                          {copiedCode === code.code ? '✓ Copied' : 'Copy Code'}
                        </button>
                        <button
                          onClick={() => copyJoinLink(code.code)}
                          type="button"
                          className="btn btn-secondary text-sm min-h-[44px]"
                        >
                          {copiedCode === code.code + '-link' ? '✓ Copied Link' : 'Copy Join Link'}
                        </button>
                        <button
                          onClick={() => toggleCodeActive(code.id, !code.active)}
                          type="button"
                          className="btn btn-secondary text-sm min-h-[44px]"
                        >
                          {code.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteCode(code.id, code.usedCount)}
                          type="button"
                          className="btn btn-danger text-sm min-h-[44px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {event.eventCodes.length > 0 && (
                <div className="mt-6 p-4 bg-primary-50 border-2 border-primary-200 rounded-2xl">
                  <h4 className="text-sm font-semibold text-primary-900 mb-2">How to Share</h4>
                  <p className="text-sm text-primary-800">
                    Share the <strong>event code</strong> with participants, or use the <strong>join link</strong> to 
                    pre-fill the code. Participants visit {window.location.origin} and enter the code.
                  </p>
                </div>
              )}
            </div>

            {/* Quests & Script Editing */}
            <div className="card-elevated">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Quests & Scripts</h3>
              <p className="text-sm text-gray-600 mb-4">Manage and remove generated quests by district. Deleting a quest is permanent.</p>
              {event.regions.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No districts or quests yet. Once rooms are generated with AI or quests are created manually,
                  you can fine-tune their copy here.
                </p>
              ) : (
                <div className="space-y-6">
                  {event.regions.map((region) => {
                    const regionQuests = region.quests ?? [];
                    const hasDeletableQuests = regionQuests.some((q) => (q._count?.rooms ?? 0) === 0);
                    return (
                      <div key={region.id} className="border-2 border-gray-200 rounded-2xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="text-md font-semibold text-gray-800">
                              {region.displayName}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {(region.quests?.length ?? 0)} quest(s)
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasDeletableQuests && (
                              <button
                                type="button"
                                onClick={() => deleteRegionQuestsWithNoRooms(region)}
                                disabled={deletingRegionId === region.id}
                                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                {deletingRegionId === region.id ? 'Deleting…' : 'Delete all quests with no rooms'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeDistrict(region)}
                              disabled={deletingDistrictId === region.id || (region._count?.quests ?? 0) > 0}
                              className="text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={(region._count?.quests ?? 0) > 0 ? 'Remove all quests in this district first' : 'Remove this district'}
                            >
                              {deletingDistrictId === region.id ? 'Removing…' : 'Remove district'}
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          {regionQuests.length === 0 ? (
                            <p className="text-xs text-gray-500">No quests in this district yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {regionQuests.map((quest) => (
                                <div
                                  key={quest.id}
                                  className="flex items-center justify-between rounded-2xl border-2 border-gray-200 px-4 py-3"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {quest.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(quest._count?.rooms ?? 0)} room(s) created
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/organiser/quests/${quest.id}`}
                                      className="btn btn-ghost text-sm min-h-[40px] text-primary-600 hover:text-primary-800 font-semibold"
                                    >
                                      Edit script
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => deleteQuest(quest)}
                                      disabled={deletingQuestId === quest.id || (quest._count?.rooms ?? 0) > 0}
                                      className="btn btn-danger text-sm min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={(quest._count?.rooms ?? 0) > 0 ? 'Remove or complete rooms first' : 'Delete this quest'}
                                    >
                                      {deletingQuestId === quest.id ? 'Deleting…' : 'Delete'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
