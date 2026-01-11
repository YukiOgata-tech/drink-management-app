import { create } from 'zustand';
import { Event, EventMember } from '@/types';
import { dummyEvents, dummyEventMembers } from '@/data/dummy_data';

interface EventsState {
  events: Event[];
  eventMembers: EventMember[];
  addEvent: (event: Event) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  getEventById: (id: string) => Event | undefined;
  getEventMembers: (eventId: string) => EventMember[];
  addEventMember: (member: EventMember) => void;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: dummyEvents,
  eventMembers: dummyEventMembers,

  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),

  updateEvent: (id, updates) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id
          ? { ...event, ...updates, updatedAt: new Date().toISOString() }
          : event
      ),
    })),

  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
      eventMembers: state.eventMembers.filter(
        (member) => member.eventId !== id
      ),
    })),

  getEventById: (id) => get().events.find((event) => event.id === id),

  getEventMembers: (eventId) =>
    get().eventMembers.filter((member) => member.eventId === eventId),

  addEventMember: (member) =>
    set((state) => ({ eventMembers: [...state.eventMembers, member] })),
}));
