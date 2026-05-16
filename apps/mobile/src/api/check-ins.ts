import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckInItem, CreateCheckInBody, ListCheckInsResponse } from '@vitapeak/contracts';
import { apiFetch } from './client';

const CHECK_INS_KEY = ['check-ins'] as const;

export function useCheckIns() {
  return useQuery<ListCheckInsResponse>({
    queryKey: CHECK_INS_KEY,
    queryFn: () => apiFetch<ListCheckInsResponse>('/api/check-ins'),
  });
}

export interface SubmitContext {
  previous: ListCheckInsResponse | undefined;
  optimisticId: string;
}

export function useSubmitCheckIn() {
  const qc = useQueryClient();
  return useMutation<CheckInItem, Error, CreateCheckInBody, SubmitContext>({
    mutationFn: (body) =>
      apiFetch<CheckInItem>('/api/check-ins', {
        method: 'POST',
        body,
      }),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: CHECK_INS_KEY });
      const previous = qc.getQueryData<ListCheckInsResponse>(CHECK_INS_KEY);
      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: CheckInItem = {
        id: optimisticId,
        clientId: 'optimistic',
        occurredAt: body.occurredAt ?? new Date().toISOString(),
        mood: body.mood ?? null,
        notes: body.notes ?? null,
        painPoints: body.painPoints.map((p, idx) => ({
          id: `${optimisticId}-pp-${idx}`,
          bodyRegionId: p.bodyRegionId,
          painType: p.painType,
          level: p.level,
          x: p.x ?? null,
          y: p.y ?? null,
          notes: p.notes ?? null,
        })),
      };
      qc.setQueryData<ListCheckInsResponse>(CHECK_INS_KEY, (old) => ({
        checkIns: [optimistic, ...(old?.checkIns ?? [])],
      }));
      return { previous, optimisticId };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) qc.setQueryData(CHECK_INS_KEY, ctx.previous);
    },
    onSuccess: (saved, _body, ctx) => {
      qc.setQueryData<ListCheckInsResponse>(CHECK_INS_KEY, (old) => {
        if (!old) return { checkIns: [saved] };
        return {
          checkIns: old.checkIns.map((c) => (c.id === ctx?.optimisticId ? saved : c)),
        };
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: CHECK_INS_KEY });
    },
  });
}

export { CHECK_INS_KEY };
