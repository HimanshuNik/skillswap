#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6700ffc6543381b5e8577cd69aec74ab63219ddbf62a4ee956e57f88ce94c1c8/contract';
import startContract from '../../snapshots/6700ffc6543381b5e8577cd69aec74ab63219ddbf62a4ee956e57f88ce94c1c8/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7ad23168ef7b30c4de2bc32fddb5ac6356464b3e270588b4c846d5353a75ce90/contract';
import endContract from '../../snapshots/7ad23168ef7b30c4de2bc32fddb5ac6356464b3e270588b4c846d5353a75ce90/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Notification',
        column: col('linkUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('cancellationReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('cancelledBy', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('completedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('completedBy', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('completionConfirmedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('disputedBy', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('meetingProvider', 'text', {
          default: lit('Jitsi'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('meetingRoomId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('proposedEnd', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('proposedStart', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('rescheduleReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('scheduledEnd', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('scheduledStart', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('timezone', 'text', {
          default: lit('UTC'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'UserAvailability',
        column: col('createdAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'UserLearningSkill',
        column: col('createdAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'UserTeachingSkill',
        column: col('createdAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'UserTeachingSkill',
        column: col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Session', column: 'scheduledAt' }),
      this.setDefault({
        schema: 'public',
        table: 'Session',
        column: 'status',
        defaultSql: "DEFAULT 'SCHEDULED'",
        operationClass: 'widening',
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_isRead_idx_a2737ae3',
        columns: ['isRead'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Skill',
        index: 'Skill_category_idx_f2600f8e',
        columns: ['category'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapRequest',
        index: 'SwapRequest_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_email_idx_46df9cad',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_username_idx_b719d535',
        columns: ['username'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
