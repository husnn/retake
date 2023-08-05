export enum ChangeType {
  Credit = 'credit',
  Reserve = 'reserve',
  Release = 'release',
  Debit = 'debit'
}

export enum ChangeReason {
  Deposit = 'deposit',
  VideoProcessingJob = 'video_processing_job'
}

export class Balance {
  id: number;
  dateCreated: Date;
  userId: string;
  changeType: ChangeType;
  changeReason: ChangeReason;
  delta: number;
  foreignId: string;
  expiresAt?: Date;
  descriptor?: string;
}

export default Balance;
