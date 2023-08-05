import { Payment } from '../entities';
import Repository from './Repository';

export interface PaymentRepository extends Repository<Payment> {}

export default PaymentRepository;
