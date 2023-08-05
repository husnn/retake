import { Balance, BalanceRepository as IBalanceRepository } from '@retake/core';

import BalanceSchema from '../schemas/BalanceSchema';
import Repository from './Repository';

export class BalanceRepository
  extends Repository<Balance>
  implements IBalanceRepository
{
  constructor() {
    super(BalanceSchema);
  }

  async sumDeltas(userId: string): Promise<number> {
    const { sum } = await this.db
      .createQueryBuilder('balance')
      .select('SUM(balance.delta)', 'sum')
      .where('balance.user_id = :userId', { userId })
      .getRawOne();
    return sum;
  }
}

export default BalanceRepository;
