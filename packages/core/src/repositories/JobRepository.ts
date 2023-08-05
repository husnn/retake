import { Job } from '../entities';
import Repository from './Repository';

export interface JobRepository extends Repository<Job> {}

export default JobRepository;
