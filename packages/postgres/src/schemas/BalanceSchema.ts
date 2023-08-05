import { Balance, ChangeReason, ChangeType } from '@retake/core';
import { EntitySchema } from 'typeorm';

const BalanceSchema = new EntitySchema<Balance>({
  name: 'balances',
  columns: {
    id: {
      type: 'bigint',
      generated: 'increment',
      primary: true
    },
    dateCreated: {
      type: 'timestamptz',
      name: 'date_created'
    },
    userId: {
      type: 'text',
      name: 'user_id'
    },
    changeType: {
      type: 'enum',
      name: 'change_type',
      enum: ChangeType
    },
    changeReason: {
      type: 'enum',
      name: 'change_reason',
      enum: ChangeReason
    },
    delta: {
      type: 'numeric',
      precision: 15,
      scale: 6
    },
    foreignId: {
      type: 'text',
      name: 'foreign_id'
    },
    expiresAt: {
      type: 'timestamptz',
      name: 'expires_at',
      nullable: true
    },
    descriptor: {
      type: 'text',
      nullable: true
    }
  }
});

export default BalanceSchema;
