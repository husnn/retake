import { PaymentRepository as IPaymentRepository, Payment } from '@retake/core';

import PaymentSchema from '../schemas/PaymentSchema';
import Repository from './Repository';

export class PaymentRepository
  extends Repository<Payment>
  implements IPaymentRepository
{
  constructor() {
    super(PaymentSchema);
  }
}

export default PaymentRepository;
