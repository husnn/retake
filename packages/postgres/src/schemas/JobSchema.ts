import { ComputeProvider, Job, JobType } from '@retake/core';
import { EntitySchema } from 'typeorm';

const JobSchema = new EntitySchema<Job>({
  name: 'jobs',
  columns: {
    id: {
      type: 'uuid',
      generated: 'uuid',
      primary: true
    },
    dateCreated: {
      type: 'timestamptz',
      name: 'date_created'
    },
    type: {
      type: 'enum',
      enum: JobType
    },
    resourceId: {
      type: 'text',
      name: 'resource_id'
    },
    provider: {
      type: 'enum',
      enum: ComputeProvider
    },
    externalId: {
      type: 'text',
      name: 'external_id'
    },
    cost: {
      type: 'numeric',
      precision: 15,
      scale: 6
    },
    completed: {
      type: 'boolean'
    },
    successful: {
      type: 'boolean'
    },
    result: {
      type: 'jsonb',
      nullable: true
    }
  }
});

export default JobSchema;
