'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Member = {
  id: string;
  name: string;
  organisation: string;
  role: string;
};

type RoomData = {
  id: string;
  roomCode: string;
  status: string;
  questName: string;
  questDescription: string;
  memberCount: number;
  maxPlayers: number;
  minPlayersToStart: number;
  members: Member[];
};

export default function RoomLobbyPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    loadRoom();
    const interval = setInterval(loadRoom, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    console.log('[EchoRoom] pushSupported initial:', isSupported);
    setPushSupported(isSupported);

    if (isSupported) {
      console.log('[EchoRoom] Push supported, registering service worker');
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          console.log('[EchoRoom] Service worker registered');
        })
        .catch((err) => {
          console.error('[EchoRoom] Service worker registration failed', err);
        });
    } else {
      console.log('[EchoRoom] Push not supported in this browser');
    }
  }, []);

  const enablePushNotifications = async () => {
    setPushError(null);
    try {
      console.log('[EchoRoom] Enable push clicked, pushSupported =', pushSupported);
      if (!pushSupported) return;
      const permission = await Notification.requestPermission();
      console.log('[EchoRoom] Notification permission result:', permission);
      if (permission !== 'granted') {
        setPushError('Notifications were blocked. You can enable them in your browser settings.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      console.log('[EchoRoom] Service worker ready:', registration);
      console.log('[EchoRoom] Fetching VAPID public key...');
      const response = await fetch('/api/push/vapid-public-key');
      console.log('[EchoRoom] VAPID public key response status:', response.status);
      const { publicKey } = await response.json();
      console.log('[EchoRoom] VAPID public key length:', publicKey?.length);
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      console.log('[EchoRoom] Subscribing with PushManager...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log('[EchoRoom] Subscription object:', subscription);
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setPushEnabled(true);
      console.log('[EchoRoom] Push subscription created and sent to server');
    } catch (err) {
      console.error('[EchoRoom] Failed to enable push notifications', err);
      setPushError('Something went wrong enabling notifications.');
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const loadRoom = async () => {
    try {
      const res = await fetch(`/api/room/${roomId}`);
      const data = await res.json();
      if (data.error) {
        router.push('/world');
        return;
      }
      setRoom(data.room);
      setLoading(false);
      if (data.room.status === 'IN_PROGRESS') {
        router.push(`/room/${roomId}/play`);
      } else if (data.room.status === 'COMPLETED' && data.room.hasArtifact) {
        router.push(`/artifact/${data.room.artifactId}`);
      }
    } catch {
      // keep previous state
    }
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading room…</p>
        </div>
      </div>
    );
  }

  const maxPlayers = room.maxPlayers ?? 3;
  const emptySlots = Math.max(0, maxPlayers - room.members.length);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/world')}
          className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1 pr-4">Room</h1>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-primary-600 px-4 py-6 text-center">
            <h2 className="text-xl font-bold text-white mb-1">{room.questName}</h2>
            <p className="text-white/80 text-sm">{room.questDescription}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide text-center mb-1">Share this code</p>
            <p className="text-3xl font-mono font-bold text-gray-900 text-center tracking-[0.25em] py-3">{room.roomCode}</p>

            <div className="flex items-center justify-between mt-4 mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Team</h3>
              <span className="text-xs text-gray-500">{room.memberCount} / {maxPlayers}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1">
              {room.members.map((member) => (
                <div key={member.id} className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[72px]">{member.name}</span>
                </div>
              ))}
              {[...Array(emptySlots)].map((_, i) => (
                <div key={`empty-${i}`} className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                  <span className="text-xs text-gray-400">—</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-primary-50 border border-primary-100">
              <p className="text-sm text-primary-800">
                Quest starts when {room.minPlayersToStart}+ have joined, then runs ready check, five blind-input beats with roll reveals, and a final synthesis.
              </p>
            </div>
          {pushSupported && (
            <div className="mt-3 p-3 rounded-2xl bg-white border border-dashed border-primary-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Get a notification when your room is ready
                  </p>
                  <p className="text-xs text-gray-500">
                    We’ll send a push notification on this device when enough people have joined. Make sure
                    notifications are turned on for this browser on your device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={enablePushNotifications}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-primary-500 text-primary-600 hover:bg-primary-50 disabled:opacity-60"
                  disabled={pushEnabled}
                >
                  {pushEnabled ? 'Enabled' : 'Enable'}
                </button>
              </div>
              {pushError && (
                <p className="mt-2 text-xs text-red-500">
                  {pushError}
                </p>
              )}
            </div>
          )}
          </div>
        </div>
        <p className="text-center mt-4">
          <button type="button" onClick={() => router.push('/world')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            Leave room
          </button>
        </p>
      </main>
    </div>
  );
}
