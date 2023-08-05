export enum PaymentProvider {
  Stripe = 'stripe'
}

export class Payment {
  id: string;
  dateCreated: Date;
  provider: PaymentProvider;
  externalId: string;
  currency: string;
  amount: number;
}

export default Payment;
