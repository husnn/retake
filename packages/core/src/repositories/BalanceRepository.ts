import { Balance } from '../entities';
import Repository from './Repository';

export interface BalanceRepository extends Repository<Balance> {
  sumDeltas(userId: string): Promise<number>;
}

export default BalanceRepository;
