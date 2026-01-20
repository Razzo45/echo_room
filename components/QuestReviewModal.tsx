'use client';

import { useState } from 'react';
import type { EventGenerationOutput, RegionData, QuestData, DecisionData, OptionData } from '@/lib/ai/schemas';

type QuestReviewModalProps = {
  draft: EventGenerationOutput;
  generationId: string;
  onClose: () => void;
  onConfirm: (editedDraft: EventGenerationOutput) => Promise<void>;
};

export default function QuestReviewModal({
  draft,
  generationId,
  onClose,
  onConfirm,
}: QuestReviewModalProps) {
  const [editedDraft, setEditedDraft] = useState<EventGenerationOutput>(draft);
  const [saving, setSaving] = useState(false);
  const [activeRegion, setActiveRegion] = useState(0);
  const [activeQuest, setActiveQuest] = useState(0);
  const [expandedDecision, setExpandedDecision] = useState<{ region: number; quest: number; decision: number } | null>(null);

  const updateRegion = (regionIndex: number, updates: Partial<RegionData>) => {
    const updated = { ...editedDraft };
    updated.regions[regionIndex] = { ...updated.regions[regionIndex], ...updates };
    setEditedDraft(updated);
  };

  const updateQuest = (regionIndex: number, questIndex: number, updates: Partial<QuestData>) => {
    const updated = { ...editedDraft };
    updated.regions[regionIndex].quests[questIndex] = {
      ...updated.regions[regionIndex].quests[questIndex],
      ...updates,
    };
    setEditedDraft(updated);
  };

  const updateDecision = (
    regionIndex: number,
    questIndex: number,
    decisionIndex: number,
    updates: Partial<DecisionData>
  ) => {
    const updated = { ...editedDraft };
    updated.regions[regionIndex].quests[questIndex].decisions[decisionIndex] = {
      ...updated.regions[regionIndex].quests[questIndex].decisions[decisionIndex],
      ...updates,
    };
    setEditedDraft(updated);
  };

  const updateOption = (
    regionIndex: number,
    questIndex: number,
    decisionIndex: number,
    optionIndex: number,
    updates: Partial<OptionData>
  ) => {
    const updated = { ...editedDraft };
    updated.regions[regionIndex].quests[questIndex].decisions[decisionIndex].options[optionIndex] = {
      ...updated.regions[regionIndex].quests[questIndex].decisions[decisionIndex].options[optionIndex],
      ...updates,
    };
    setEditedDraft(updated);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(editedDraft);
    } finally {
      setSaving(false);
    }
  };

  const currentRegion = editedDraft.regions[activeRegion];
  const currentQuest = currentRegion?.quests[activeQuest];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Review AI-Generated Content</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and edit the generated quests, decisions, and options before saving
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar - Regions and Quests */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Regions</h3>
              {editedDraft.regions.map((region, regionIdx) => (
                <div key={regionIdx} className="mb-4">
                  <button
                    onClick={() => {
                      setActiveRegion(regionIdx);
                      setActiveQuest(0);
                      setExpandedDecision(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      activeRegion === regionIdx
                        ? 'bg-indigo-100 text-indigo-900'
                        : 'bg-white hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="font-semibold text-sm">{region.displayName}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {region.quests.length} quest{region.quests.length !== 1 ? 's' : ''}
                    </div>
                  </button>

                  {activeRegion === regionIdx && (
                    <div className="mt-2 ml-4 space-y-1">
                      {region.quests.map((quest, questIdx) => (
                        <button
                          key={questIdx}
                          onClick={() => {
                            setActiveQuest(questIdx);
                            setExpandedDecision(null);
                          }}
                          className={`w-full text-left p-2 rounded text-sm transition ${
                            activeQuest === questIdx
                              ? 'bg-indigo-200 text-indigo-900 font-medium'
                              : 'bg-white hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {quest.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentRegion && currentQuest ? (
              <div className="space-y-6">
                {/* Region Info */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Region Name
                  </label>
                  <input
                    type="text"
                    value={currentRegion.displayName}
                    onChange={(e) => updateRegion(activeRegion, { displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {currentRegion.description && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Region Description
                    </label>
                    <textarea
                      value={currentRegion.description}
                      onChange={(e) => updateRegion(activeRegion, { description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Quest Info */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quest: {currentQuest.name}</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Quest Name
                      </label>
                      <input
                        type="text"
                        value={currentQuest.name}
                        onChange={(e) => updateQuest(activeRegion, activeQuest, { name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Quest Description
                      </label>
                      <textarea
                        value={currentQuest.description}
                        onChange={(e) => updateQuest(activeRegion, activeQuest, { description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={currentQuest.durationMinutes}
                          onChange={(e) =>
                            updateQuest(activeRegion, activeQuest, {
                              durationMinutes: parseInt(e.target.value) || 30,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decisions */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Decisions</h3>
                  <div className="space-y-4">
                    {currentQuest.decisions.map((decision, decisionIdx) => (
                      <div
                        key={decisionIdx}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <button
                          onClick={() =>
                            setExpandedDecision(
                              expandedDecision?.decision === decisionIdx &&
                              expandedDecision?.region === activeRegion &&
                              expandedDecision?.quest === activeQuest
                                ? null
                                : { region: activeRegion, quest: activeQuest, decision: decisionIdx }
                            )
                          }
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Decision {decision.decisionNumber}: {decision.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{decision.context}</p>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              expandedDecision?.decision === decisionIdx &&
                              expandedDecision?.region === activeRegion &&
                              expandedDecision?.quest === activeQuest
                                ? 'transform rotate-180'
                                : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {expandedDecision?.decision === decisionIdx &&
                          expandedDecision?.region === activeRegion &&
                          expandedDecision?.quest === activeQuest && (
                            <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Decision Title
                                </label>
                                <input
                                  type="text"
                                  value={decision.title}
                                  onChange={(e) =>
                                    updateDecision(activeRegion, activeQuest, decisionIdx, {
                                      title: e.target.value,
                                    })
                                  }
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Context / Background
                                </label>
                                <textarea
                                  value={decision.context}
                                  onChange={(e) =>
                                    updateDecision(activeRegion, activeQuest, decisionIdx, {
                                      context: e.target.value,
                                    })
                                  }
                                  rows={3}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>

                              {/* Options */}
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                  Options (A, B, C)
                                </label>
                                <div className="space-y-4">
                                  {decision.options.map((option, optionIdx) => (
                                    <div
                                      key={optionIdx}
                                      className="border border-indigo-200 rounded-lg p-4 bg-white"
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold text-indigo-900">
                                          Option {option.optionKey}
                                        </span>
                                      </div>

                                      <div className="space-y-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Title
                                          </label>
                                          <input
                                            type="text"
                                            value={option.title}
                                            onChange={(e) =>
                                              updateOption(
                                                activeRegion,
                                                activeQuest,
                                                decisionIdx,
                                                optionIdx,
                                                { title: e.target.value }
                                              )
                                            }
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Description
                                          </label>
                                          <textarea
                                            value={option.description}
                                            onChange={(e) =>
                                              updateOption(
                                                activeRegion,
                                                activeQuest,
                                                decisionIdx,
                                                optionIdx,
                                                { description: e.target.value }
                                              )
                                            }
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Impact / Outcomes
                                          </label>
                                          <textarea
                                            value={option.impact}
                                            onChange={(e) =>
                                              updateOption(
                                                activeRegion,
                                                activeQuest,
                                                decisionIdx,
                                                optionIdx,
                                                { impact: e.target.value }
                                              )
                                            }
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Tradeoffs
                                          </label>
                                          <textarea
                                            value={option.tradeoff}
                                            onChange={(e) =>
                                              updateOption(
                                                activeRegion,
                                                activeQuest,
                                                decisionIdx,
                                                optionIdx,
                                                { tradeoff: e.target.value }
                                              )
                                            }
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">No content to review</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Confirm and Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
