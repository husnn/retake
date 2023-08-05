import { Payment, PaymentProvider } from '@retake/core';
import { EntitySchema } from 'typeorm';

const PaymentSchema = new EntitySchema<Payment>({
  name: 'payments',
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
    provider: {
      type: 'enum',
      enum: PaymentProvider
    },
    externalId: {
      type: 'text',
      name: 'external_id'
    },
    currency: {
      type: 'text'
    },
    amount: {
      type: 'numeric',
      precision: 15,
      scale: 6
    }
  }
});

export default PaymentSchema;
