import { create } from 'zustand';
import { Event, EventMember } from '@/types';
import * as EventsAPI from '@/lib/events';

// 空配列の安定した参照（再レンダリング防止）
const EMPTY_MEMBERS: EventMember[] = [];

interface EventsState {
  events: Event[];
  eventMembers: Map<string, EventMember[]>; // eventId -> members
  totalCount: number; // 総イベント数
  loading: boolean;
  error: string | null;

  // イベント操作
  fetchEvents: (userId: string, options?: { limit?: number; offset?: number; append?: boolean }) => Promise<void>;
  fetchEventById: (eventId: string) => Promise<Event | null>;
  fetchEventByInviteCode: (inviteCode: string) => Promise<Event | null>;
  createEvent: (params: {
    title: string;
    description?: string;
    recordingRule: 'self' | 'host_only' | 'consensus';
    requiredApprovals?: number;
    startedAt: string;
    hostId: string;
  }) => Promise<{ event: Event | null; error: string | null }>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
  endEvent: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // イベントメンバー操作
  fetchEventMembers: (eventId: string) => Promise<void>;
  addEventMember: (params: {
    eventId: string;
    userId: string;
    role: 'host' | 'manager' | 'member';
  }) => Promise<void>;
  updateEventMember: (eventId: string, userId: string, updates: Partial<EventMember>) => Promise<void>;
  leaveEvent: (eventId: string, userId: string) => Promise<void>;

  // ローカル取得
  getEventById: (id: string) => Event | undefined;
  getEventMembers: (eventId: string) => EventMember[];
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  eventMembers: new Map(),
  totalCount: 0,
  loading: false,
  error: null,

  // =====================================================
  // イベント操作
  // =====================================================

  fetchEvents: async (userId: string, options?: { limit?: number; offset?: number; append?: boolean }) => {
    set({ loading: true, error: null });
    const { events, totalCount, error } = await EventsAPI.getEvents(userId, {
      limit: options?.limit,
      offset: options?.offset,
    });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    if (options?.append) {
      // 追加読み込み時は既存のイベントに追加
      set((state) => ({
        events: [...state.events, ...events],
        totalCount,
        loading: false,
      }));
    } else {
      // 初回読み込み時は置き換え
      set({ events, totalCount, loading: false });
    }
  },

  fetchEventById: async (eventId: string) => {
    set({ loading: true, error: null });
    const { event, error } = await EventsAPI.getEventById(eventId);

    if (error) {
      set({ loading: false, error: error.message });
      return null;
    }

    // ローカルの events を更新
    set((state) => {
      const index = state.events.findIndex((e) => e.id === eventId);
      const newEvents = [...state.events];

      if (index !== -1 && event) {
        newEvents[index] = event;
      } else if (event) {
        newEvents.push(event);
      }

      return { events: newEvents, loading: false };
    });

    return event;
  },

  fetchEventByInviteCode: async (inviteCode: string) => {
    set({ loading: true, error: null });
    const { event, error } = await EventsAPI.getEventByInviteCode(inviteCode);

    if (error) {
      set({ loading: false, error: error.message });
      return null;
    }

    set({ loading: false });
    return event;
  },

  createEvent: async (params) => {
    set({ loading: true, error: null });
    const { event, error } = await EventsAPI.createEvent(params);

    if (error) {
      set({ loading: false, error: error.message });
      return { event: null, error: error.message };
    }

    if (event) {
      // ホストはDBトリガーで自動的にメンバーとして追加される
      set((state) => ({
        events: [event, ...state.events],
        loading: false,
      }));
    }

    return { event, error: null };
  },

  updateEvent: async (id: string, updates: Partial<Event>) => {
    const { error } = await EventsAPI.updateEvent(id, updates);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? { ...event, ...updates, updatedAt: new Date().toISOString() } : event
      ),
    }));
  },

  endEvent: async (id: string) => {
    const { error } = await EventsAPI.endEvent(id);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? { ...event, endedAt: new Date().toISOString() } : event
      ),
    }));
  },

  deleteEvent: async (id: string) => {
    const { error } = await EventsAPI.deleteEvent(id);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
      eventMembers: new Map([...state.eventMembers].filter(([key]) => key !== id)),
    }));
  },

  // =====================================================
  // イベントメンバー操作
  // =====================================================

  fetchEventMembers: async (eventId: string) => {
    const { members, error } = await EventsAPI.getEventMembers(eventId);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => {
      const newMap = new Map(state.eventMembers);
      newMap.set(eventId, members);
      return { eventMembers: newMap };
    });
  },

  addEventMember: async (params) => {
    const { error } = await EventsAPI.addEventMember(params);

    if (error) {
      set({ error: error.message });
      return;
    }

    // メンバーリストを再取得
    await get().fetchEventMembers(params.eventId);
  },

  updateEventMember: async (eventId: string, userId: string, updates: Partial<EventMember>) => {
    const { error } = await EventsAPI.updateEventMember(eventId, userId, updates);

    if (error) {
      set({ error: error.message });
      return;
    }

    // メンバーリストを再取得
    await get().fetchEventMembers(eventId);
  },

  leaveEvent: async (eventId: string, userId: string) => {
    const { error } = await EventsAPI.leaveEvent(eventId, userId);

    if (error) {
      set({ error: error.message });
      return;
    }

    // メンバーリストを再取得
    await get().fetchEventMembers(eventId);
  },

  // =====================================================
  // ローカル取得
  // =====================================================

  getEventById: (id) => get().events.find((event) => event.id === id),

  getEventMembers: (eventId) => get().eventMembers.get(eventId) ?? EMPTY_MEMBERS,
}));
