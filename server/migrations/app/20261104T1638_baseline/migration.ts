#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5d499d0c37817aa495326ea105a2792f4f934e1075914e9fc9d2dc19d41d5647/contract';
import endContract from '../../snapshots/5d499d0c37817aa495326ea105a2792f4f934e1075914e9fc9d2dc19d41d5647/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Conversation',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('swapRequestId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ConversationParticipant',
        columns: [
          col('conversationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Message',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('conversationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('senderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Notification',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isRead', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('referenceId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('referenceType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Review',
        columns: [
          col('comment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rating', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revieweeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reviewerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sessionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Session',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('disputeReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('duration', 'int4', {
            notNull: true,
            default: lit(60),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('learnerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('meetingUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('proposedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('rescheduledBy', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('scheduledAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('skillId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('REQUESTED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('swapRequestId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('teacherId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Skill',
        columns: [
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SwapRequest',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('receiverId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('receiverSkillId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('senderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('senderSkillId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('averageRating', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('bio', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('completedSessions', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isOnboarded', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('location', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordResetExpiresAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('passwordResetHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('timezone', 'text', { default: lit('UTC'), codecRef: { codecId: 'pg/text@1' } }),
          col('totalReviews', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'UserAvailability',
        columns: [
          col('dayOfWeek', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('timeSlot', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'UserLearningSkill',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('skillId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('targetLevel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'UserTeachingSkill',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('proficiencyLevel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('skillId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ConversationParticipant',
        constraint: 'ConversationParticipant_conversationId_userId_key',
        columns: ['conversationId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Review',
        constraint: 'Review_sessionId_reviewerId_key',
        columns: ['sessionId', 'reviewerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Skill',
        constraint: 'Skill_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_username_key',
        columns: ['username'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'UserAvailability',
        constraint: 'UserAvailability_userId_dayOfWeek_timeSlot_key',
        columns: ['userId', 'dayOfWeek', 'timeSlot'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'UserLearningSkill',
        constraint: 'UserLearningSkill_userId_skillId_key',
        columns: ['userId', 'skillId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'UserTeachingSkill',
        constraint: 'UserTeachingSkill_userId_skillId_key',
        columns: ['userId', 'skillId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Conversation',
        index: 'Conversation_swapRequestId_idx_8b061738',
        columns: ['swapRequestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ConversationParticipant',
        index: 'ConversationParticipant_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ConversationParticipant',
        index: 'ConversationParticipant_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_senderId_idx_4689c490',
        columns: ['senderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Review',
        index: 'Review_revieweeId_idx_00d8b149',
        columns: ['revieweeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Review',
        index: 'Review_reviewerId_idx_25a27b4e',
        columns: ['reviewerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Review',
        index: 'Review_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_learnerId_idx_a2f7d5dc',
        columns: ['learnerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_skillId_idx_6e19993d',
        columns: ['skillId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_swapRequestId_idx_8b061738',
        columns: ['swapRequestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_teacherId_idx_bc266660',
        columns: ['teacherId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapRequest',
        index: 'SwapRequest_receiverId_idx_fe124f44',
        columns: ['receiverId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapRequest',
        index: 'SwapRequest_receiverSkillId_idx_c1684157',
        columns: ['receiverSkillId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapRequest',
        index: 'SwapRequest_senderId_idx_4689c490',
        columns: ['senderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapRequest',
        index: 'SwapRequest_senderSkillId_idx_3b5b42a2',
        columns: ['senderSkillId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserAvailability',
        index: 'UserAvailability_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserLearningSkill',
        index: 'UserLearningSkill_skillId_idx_6e19993d',
        columns: ['skillId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserLearningSkill',
        index: 'UserLearningSkill_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserTeachingSkill',
        index: 'UserTeachingSkill_skillId_idx_6e19993d',
        columns: ['skillId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserTeachingSkill',
        index: 'UserTeachingSkill_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Conversation',
        foreignKey: {
          name: 'Conversation_swapRequestId_fkey',
          columns: ['swapRequestId'],
          references: { schema: 'public', table: 'SwapRequest', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ConversationParticipant',
        foreignKey: {
          name: 'ConversationParticipant_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'Conversation', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ConversationParticipant',
        foreignKey: {
          name: 'ConversationParticipant_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'Conversation', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_senderId_fkey',
          columns: ['senderId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Review',
        foreignKey: {
          name: 'Review_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'Session', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Review',
        foreignKey: {
          name: 'Review_reviewerId_fkey',
          columns: ['reviewerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Review',
        foreignKey: {
          name: 'Review_revieweeId_fkey',
          columns: ['revieweeId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_swapRequestId_fkey',
          columns: ['swapRequestId'],
          references: { schema: 'public', table: 'SwapRequest', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_teacherId_fkey',
          columns: ['teacherId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_learnerId_fkey',
          columns: ['learnerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_skillId_fkey',
          columns: ['skillId'],
          references: { schema: 'public', table: 'Skill', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapRequest',
        foreignKey: {
          name: 'SwapRequest_senderId_fkey',
          columns: ['senderId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapRequest',
        foreignKey: {
          name: 'SwapRequest_receiverId_fkey',
          columns: ['receiverId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapRequest',
        foreignKey: {
          name: 'SwapRequest_senderSkillId_fkey',
          columns: ['senderSkillId'],
          references: { schema: 'public', table: 'Skill', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapRequest',
        foreignKey: {
          name: 'SwapRequest_receiverSkillId_fkey',
          columns: ['receiverSkillId'],
          references: { schema: 'public', table: 'Skill', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserAvailability',
        foreignKey: {
          name: 'UserAvailability_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserLearningSkill',
        foreignKey: {
          name: 'UserLearningSkill_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserLearningSkill',
        foreignKey: {
          name: 'UserLearningSkill_skillId_fkey',
          columns: ['skillId'],
          references: { schema: 'public', table: 'Skill', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserTeachingSkill',
        foreignKey: {
          name: 'UserTeachingSkill_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserTeachingSkill',
        foreignKey: {
          name: 'UserTeachingSkill_skillId_fkey',
          columns: ['skillId'],
          references: { schema: 'public', table: 'Skill', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
