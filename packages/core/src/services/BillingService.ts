import { Result } from '@retake/shared';
import { ChangeReason, ChangeType } from '../entities';
import { BalanceRepository, PaymentRepository } from '../repositories';

export class BillingService {
  private balanceRepository: BalanceRepository;
  private paymentRepository: PaymentRepository;

  constructor(
    balanceRepository: BalanceRepository,
    paymentRepository: PaymentRepository
  ) {
    this.balanceRepository = balanceRepository;
    this.paymentRepository = paymentRepository;
  }

  async getAvailableCredits(userId: string): Promise<Result<number>> {
    const balance = await this.balanceRepository.sumDeltas(userId);
    return Result.ok(balance);
  }

  private async createEntry(
    userId: string,
    delta: number,
    type: ChangeType,
    reason: ChangeReason,
    foreignId: string,
    expiresAt?: Date,
    descriptor?: string
  ): Promise<Result<number>> {
    const record = await this.balanceRepository.create({
      dateCreated: new Date(),
      userId,
      changeType: type,
      changeReason: reason,
      delta,
      foreignId,
      expiresAt,
      descriptor
    });
    return Result.ok(record.id);
  }

  async credit(
    userId: string,
    amount: number,
    reason: ChangeReason,
    foreignId: string,
    descriptor?: string
  ): Promise<Result<number>> {
    return this.createEntry(
      userId,
      amount,
      ChangeType.Credit,
      reason,
      foreignId,
      null,
      descriptor
    );
  }

  async reserve(
    userId: string,
    amount: number,
    reason: ChangeReason,
    foreignId: string
  ): Promise<Result<number>> {
    return this.createEntry(
      userId,
      -amount,
      ChangeType.Reserve,
      reason,
      foreignId,
      null,
      null
    );
  }

  async release(
    userId: string,
    amount: number,
    reason: ChangeReason,
    foreignId: string
  ): Promise<Result<number>> {
    return this.createEntry(
      userId,
      amount,
      ChangeType.Release,
      reason,
      foreignId,
      null,
      null
    );
  }

  async debit(
    userId: string,
    amount: number,
    reason: ChangeReason,
    foreignId: string,
    descriptor?: string
  ): Promise<Result<number>> {
    return this.createEntry(
      userId,
      -amount,
      ChangeType.Debit,
      reason,
      foreignId,
      null,
      descriptor
    );
  }
}

export default BillingService;
