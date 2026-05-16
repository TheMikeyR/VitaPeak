/**
 * In-memory draft state for the 3-step client check-in flow.
 *
 * Module-scoped + useSyncExternalStore so all three screens
 * (`check-in/index`, `check-in/details`, `check-in/review`) share state
 * without prop drilling or adding a state library. The draft is reset on
 * `resetDraft()` (called from `check-in/index` on mount) or on successful
 * submit.
 */
import { useSyncExternalStore } from 'react';
import type { PainType, PainPointInput } from '@vitapeak/contracts';

export interface PainPointDraft {
  bodyRegionId: string;
  painType: PainType;
  level: number;
  notes?: string;
}

export interface CheckInDraftState {
  selectedRegions: string[];
  painPoints: Record<string, PainPointDraft>;
  mood: number | null;
  notes: string;
}

const initial: CheckInDraftState = {
  selectedRegions: [],
  painPoints: {},
  mood: null,
  notes: '',
};

let state: CheckInDraftState = initial;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): CheckInDraftState {
  return state;
}

export function useCheckInDraft(): CheckInDraftState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function resetDraft(): void {
  state = initial;
  emit();
}

export function toggleRegion(regionId: string): void {
  const exists = state.selectedRegions.includes(regionId);
  const nextRegions = exists
    ? state.selectedRegions.filter((id) => id !== regionId)
    : [...state.selectedRegions, regionId];
  const nextPoints = { ...state.painPoints };
  if (exists) {
    delete nextPoints[regionId];
  } else {
    nextPoints[regionId] = { bodyRegionId: regionId, painType: 'ACHING', level: 5 };
  }
  state = { ...state, selectedRegions: nextRegions, painPoints: nextPoints };
  emit();
}

export function updatePainPoint(regionId: string, patch: Partial<PainPointDraft>): void {
  const current = state.painPoints[regionId];
  if (!current) return;
  state = {
    ...state,
    painPoints: { ...state.painPoints, [regionId]: { ...current, ...patch } },
  };
  emit();
}

export function setMood(mood: number | null): void {
  state = { ...state, mood };
  emit();
}

export function setNotes(notes: string): void {
  state = { ...state, notes };
  emit();
}

export function buildPainPointsPayload(): PainPointInput[] {
  return state.selectedRegions
    .map((id) => state.painPoints[id])
    .filter((p): p is PainPointDraft => Boolean(p))
    .map((p) => ({
      bodyRegionId: p.bodyRegionId,
      painType: p.painType,
      level: p.level,
      ...(p.notes ? { notes: p.notes } : {}),
    }));
}
