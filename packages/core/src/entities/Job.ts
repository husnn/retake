export enum JobType {
  ProcessVideo = 'process_video'
}

export enum ComputeProvider {
  Modal = 'modal'
}

export class Job {
  id: string;
  dateCreated: Date;
  type: JobType;
  resourceId: string;
  provider: ComputeProvider;
  externalId: string;
  cost: number;
  completed: boolean;
  successful: boolean;
  result?: object;
}

export default Job;
