'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type QuestOption = {
  id: string;
  optionKey: string;
  title: string;
  description: string;
  impact: string;
  tradeoff: string;
};

type QuestDecision = {
  id: string;
  decisionNumber: number;
  title: string;
  context: string;
  options: QuestOption[];
};

type Quest = {
  id: string;
  name: string;
  description: string;
  teamSize: number;
  minTeamSize: number;
  region: {
    displayName: string;
  };
  decisions: QuestDecision[];
};

export default function QuestEditPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.id as string;

  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuest = async () => {
      try {
        const res = await fetch(`/api/organiser/quests/${questId}`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || 'Failed to load quest');
          setLoading(false);
          return;
        }
        // Sort decisions and options for stable display
        const q: Quest = {
          ...data.quest,
          decisions: (data.quest.decisions || []).map((d: QuestDecision) => ({
            ...d,
            options: [...(d.options || [])].sort((a, b) =>
              a.optionKey.localeCompare(b.optionKey)
            ),
          })),
        };
        setQuest(q);
        setLoading(false);
      } catch (e) {
        setError('Failed to load quest');
        setLoading(false);
      }
    };
    loadQuest();
  }, [questId]);

  const handleFieldChange = (
    path: { decisionId?: string; optionId?: string } | null,
    field: keyof Quest | keyof QuestDecision | keyof QuestOption,
    value: string
  ) => {
    if (!quest) return;
    setQuest((prev) => {
      if (!prev) return prev;
      if (!path) {
        return { ...prev, [field]: value } as Quest;
      }
      const decisions = prev.decisions.map((d) => {
        if (d.id !== path.decisionId) return d;
        if (!path.optionId) {
          return { ...d, [field]: value } as QuestDecision;
        }
        const options = d.options.map((o) =>
          o.id === path.optionId ? ({ ...o, [field]: value } as QuestOption) : o
        );
        return { ...d, options };
      });
      return { ...prev, decisions };
    });
  };

  const handleSave = async () => {
    if (!quest) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organiser/quests/${quest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quest.name,
          description: quest.description,
          teamSize: quest.teamSize,
          minTeamSize: quest.minTeamSize,
          decisions: quest.decisions.map((d) => ({
            id: d.id,
            title: d.title,
            context: d.context,
            options: d.options.map((o) => ({
              id: o.id,
              title: o.title,
              description: o.description,
              impact: o.impact,
              tradeoff: o.tradeoff,
            })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to save quest');
      } else if (data.quest) {
        setQuest(data.quest);
      }
    } catch (e) {
      setError('Failed to save quest');
    }
    setSaving(false);
  };

  const handleRevert = async () => {
    if (!quest) return;
    if (
      !confirm(
        'Revert this quest to the original AI-generated script? This will discard your manual edits for this quest.'
      )
    ) {
      return;
    }
    setReverting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organiser/quests/${quest.id}/revert`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to revert quest');
      } else if (data.quest) {
        const q: Quest = {
          ...data.quest,
          decisions: (data.quest.decisions || []).map((d: QuestDecision) => ({
            ...d,
            options: [...(d.options || [])].sort((a, b) =>
              a.optionKey.localeCompare(b.optionKey)
            ),
          })),
        };
        setQuest(q);
      }
    } catch (e) {
      setError('Failed to revert quest');
    }
    setReverting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quest...</p>
        </div>
      </div>
    );
  }

  if (!quest || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quest editor</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Quest not found or could not be loaded.'}
          </p>
          <button
            onClick={() => router.back()}
            className="btn btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Edit Quest Script</h1>
              <p className="text-sm text-gray-600">
                {quest.region?.displayName ? `${quest.region.displayName} · ` : ''}
                Quest ID: {quest.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRevert}
              disabled={reverting}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {reverting ? 'Reverting…' : 'Revert to AI baseline'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save script'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quest-level fields */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quest name
            </label>
            <input
              type="text"
              value={quest.name}
              onChange={(e) =>
                handleFieldChange(null, 'name', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quest description
            </label>
            <textarea
              value={quest.description}
              onChange={(e) =>
                handleFieldChange(null, 'description', e.target.value)
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Room size – organiser only; participants cannot see or change this */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Room size</h3>
            <p className="text-xs text-gray-500 mb-3">
              Minimum and maximum players per room. Only you can change this; participants cannot see or edit it.
            </p>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min players (to start)</label>
                <input
                  type="number"
                  min={2}
                  max={5}
                  value={quest.minTeamSize ?? 2}
                  onChange={(e) => {
                    const v = Math.min(5, Math.max(2, parseInt(e.target.value, 10) || 2));
                    setQuest((p) => (p ? { ...p, minTeamSize: v, teamSize: Math.max(p.teamSize, v) } : p));
                  }}
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max players (per room)</label>
                <input
                  type="number"
                  min={2}
                  max={5}
                  value={quest.teamSize ?? 3}
                  onChange={(e) => {
                    const v = Math.min(5, Math.max(2, parseInt(e.target.value, 10) || 3));
                    setQuest((p) => (p ? { ...p, teamSize: v, minTeamSize: Math.min(p.minTeamSize, v) } : p));
                  }}
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Decisions and options */}
        {quest.decisions.map((d) => (
          <div
            key={d.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Decision {d.decisionNumber}
              </h2>
              <span className="text-xs text-gray-500">ID: {d.id}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Decision title
              </label>
              <input
                type="text"
                value={d.title}
                onChange={(e) =>
                  handleFieldChange(
                    { decisionId: d.id },
                    'title',
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context / background
              </label>
              <textarea
                value={d.context}
                onChange={(e) =>
                  handleFieldChange(
                    { decisionId: d.id },
                    'context',
                    e.target.value
                  )
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-2">
              {d.options.map((o) => (
                <div
                  key={o.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold">
                      {o.optionKey}
                    </span>
                    <span className="text-xs text-gray-500">ID: {o.id}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Option title
                    </label>
                    <input
                      type="text"
                      value={o.title}
                      onChange={(e) =>
                        handleFieldChange(
                          { decisionId: d.id, optionId: o.id },
                          'title',
                          e.target.value
                        )
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={o.description}
                      onChange={(e) =>
                        handleFieldChange(
                          { decisionId: d.id, optionId: o.id },
                          'description',
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Impact / outcomes
                    </label>
                    <textarea
                      value={o.impact}
                      onChange={(e) =>
                        handleFieldChange(
                          { decisionId: d.id, optionId: o.id },
                          'impact',
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tradeoffs
                    </label>
                    <textarea
                      value={o.tradeoff}
                      onChange={(e) =>
                        handleFieldChange(
                          { decisionId: d.id, optionId: o.id },
                          'tradeoff',
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

