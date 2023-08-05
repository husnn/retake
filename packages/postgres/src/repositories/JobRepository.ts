import { JobRepository as IJobRepository, Job } from '@retake/core';

import JobSchema from '../schemas/JobSchema';
import Repository from './Repository';

export class JobRepository extends Repository<Job> implements IJobRepository {
  constructor() {
    super(JobSchema);
  }
}

export default JobRepository;
