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
        'Revert this scenario to the last AI-generated baseline? This will discard your manual edits for this quest.'
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scenario...</p>
        </div>
      </div>
    );
  }

  if (!quest || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Scenario editor</h1>
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
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              type="button"
              className="text-primary-600 hover:text-primary-700 font-semibold text-sm min-h-[48px] flex items-center"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit scenario script</h1>
              <p className="text-sm text-gray-600">
                {quest.region?.displayName ? `${quest.region.displayName} · ` : ''}
                Scenario ID: {quest.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRevert}
              disabled={reverting}
              type="button"
              className="btn btn-secondary"
            >
              {reverting ? 'Reverting…' : 'Revert to generated baseline'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              type="button"
              className="btn btn-primary"
            >
              {saving ? 'Saving…' : 'Save scenario'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8 space-y-6 safe-bottom">
        {/* Scenario (quest) overview */}
        <div className="card-elevated space-y-4">
          <div>
            <label className="label">Scenario title</label>
            <input
              type="text"
              value={quest.name}
              onChange={(e) =>
                handleFieldChange(null, 'name', e.target.value)
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">Scenario briefing</label>
            <textarea
              value={quest.description}
              onChange={(e) =>
                handleFieldChange(null, 'description', e.target.value)
              }
              rows={4}
              className="input resize-y"
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
                <label className="label text-xs">Min players (to start)</label>
                <input
                  type="number"
                  min={2}
                  max={5}
                  value={quest.minTeamSize ?? 2}
                  onChange={(e) => {
                    const v = Math.min(5, Math.max(2, parseInt(e.target.value, 10) || 2));
                    setQuest((p) => (p ? { ...p, minTeamSize: v, teamSize: Math.max(p.teamSize, v) } : p));
                  }}
                  className="input w-24"
                />
              </div>
              <div>
                <label className="label text-xs">Max players (per room)</label>
                <input
                  type="number"
                  min={2}
                  max={5}
                  value={quest.teamSize ?? 3}
                  onChange={(e) => {
                    const v = Math.min(5, Math.max(2, parseInt(e.target.value, 10) || 3));
                    setQuest((p) => (p ? { ...p, teamSize: v, minTeamSize: Math.min(p.minTeamSize, v) } : p));
                  }}
                  className="input w-24"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary-100 bg-primary-50/80 px-4 py-3 text-sm text-primary-900">
          <p className="font-medium text-primary-950">How this maps to live play</p>
          <p className="mt-1 text-primary-900/90">
            Participants run through <strong>three story beats</strong>. Each beat is blind one-line actions, then a{' '}
            <strong>d20 roll</strong> that resolves the moment. The fields below set the beat prompt and three{' '}
            <strong>paths</strong> (A/B/C) the narrative can lean on—think tone and framing, not a branching vote UI.
          </p>
        </div>

        {/* Story beats (stored as decisions + options in the API) */}
        {quest.decisions.map((d) => (
          <div
            key={d.id}
            className="card-elevated space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Beat {d.decisionNumber}
              </h2>
              <span className="text-xs text-gray-500 font-mono">Beat ID: {d.id}</span>
            </div>

            <div>
              <label className="label">Beat title</label>
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
                className="input"
              />
            </div>

            <div>
              <label className="label">Scene &amp; stakes</label>
              <p className="text-xs text-gray-500 -mt-1 mb-1">
                What is happening this round? This text informs facilitation and prompts before the dice resolve the beat.
              </p>
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
                className="input resize-y"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-2">
              {d.options.map((o) => (
                <div
                  key={o.id}
                  className="border-2 border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-primary-100 text-primary-800 text-sm font-semibold">
                        {o.optionKey}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 truncate">Path {o.optionKey}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono shrink-0">ID: {o.id}</span>
                  </div>

                  <div>
                    <label className="label text-xs">Path label</label>
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
                      className="input text-sm"
                    />
                  </div>

                  <div>
                    <label className="label text-xs">Path summary</label>
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
                      className="input text-sm resize-y"
                    />
                  </div>

                  <div>
                    <label className="label text-xs">Outcome &amp; risk (for narrative)</label>
                    <p className="text-xs text-gray-500 -mt-1 mb-1">
                      Two short sentences: what goes well, then what could bite. Feeds prompts and artifact copy.
                    </p>
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
                      className="input text-sm resize-y"
                    />
                  </div>

                  <div>
                    <label className="label text-xs">Tradeoff (what the team accepts)</label>
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
                      className="input text-sm resize-y"
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

