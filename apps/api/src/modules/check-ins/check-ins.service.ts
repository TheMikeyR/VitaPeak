import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CreateCheckInBody,
  ListCheckInsQuery,
  CheckInItem,
  PainPointItem,
  PainType,
} from '@vitapeak/contracts';
import { PrismaService } from '../../db/prisma.service.js';

export interface CheckInsActorContext {
  clientDbId: string;
  clinicId: string;
}

// Prisma's `defineExtension` with `$allOperations` typed as `any` erases the
// model-specific return type. We narrow back at the boundary via this shape —
// it matches what `include: { painPoints: true }` actually returns at runtime.
type CheckInWithPoints = {
  id: string;
  clientId: string;
  occurredAt: Date;
  mood: number | null;
  notes: string | null;
  painPoints: Array<{
    id: string;
    bodyRegionId: string;
    painType: PainType;
    level: number;
    x: number | null;
    y: number | null;
    notes: string | null;
  }>;
};

@Injectable()
export class CheckInsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForClient(
    actor: CheckInsActorContext,
    body: CreateCheckInBody,
  ): Promise<CheckInItem> {
    const regionIds = [...new Set(body.painPoints.map((p) => p.bodyRegionId))];
    const knownRegions = await this.prisma.client.bodyRegion.findMany({
      where: { id: { in: regionIds } },
      select: { id: true },
    });
    if (knownRegions.length !== regionIds.length) {
      const known = new Set(knownRegions.map((r) => r.id));
      const missing = regionIds.filter((id) => !known.has(id));
      throw new BadRequestException(`Unknown bodyRegionId(s): ${missing.join(', ')}`);
    }

    const created = (await this.prisma.client.checkIn.create({
      data: {
        clientId: actor.clientDbId,
        clinicId: actor.clinicId,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        mood: body.mood ?? null,
        notes: body.notes ?? null,
        painPoints: {
          create: body.painPoints.map((p) => ({
            bodyRegionId: p.bodyRegionId,
            painType: p.painType,
            level: p.level,
            x: p.x ?? null,
            y: p.y ?? null,
            notes: p.notes ?? null,
          })),
        },
      },
      include: { painPoints: true },
    })) as CheckInWithPoints;

    return this.toCheckInItem(created);
  }

  async listForClient(
    actor: CheckInsActorContext,
    query: ListCheckInsQuery,
  ): Promise<CheckInItem[]> {
    const take = query.limit ?? 50;
    const occurredAt =
      query.from || query.to
        ? {
            gte: query.from ? new Date(query.from) : undefined,
            lte: query.to ? new Date(query.to) : undefined,
          }
        : undefined;

    const rows = (await this.prisma.client.checkIn.findMany({
      where: {
        clientId: actor.clientDbId,
        ...(occurredAt ? { occurredAt } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take,
      include: { painPoints: true },
    })) as CheckInWithPoints[];

    return rows.map((r) => this.toCheckInItem(r));
  }

  private toCheckInItem(row: CheckInWithPoints): CheckInItem {
    return {
      id: row.id,
      clientId: row.clientId,
      occurredAt: row.occurredAt.toISOString(),
      mood: row.mood,
      notes: row.notes,
      painPoints: row.painPoints.map<PainPointItem>((p) => ({
        id: p.id,
        bodyRegionId: p.bodyRegionId,
        painType: p.painType,
        level: p.level,
        x: p.x,
        y: p.y,
        notes: p.notes,
      })),
    };
  }
}
