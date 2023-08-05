import { Video } from '../entities';
import Repository from './Repository';

export interface VideoRepository extends Repository<Video> {}

export default VideoRepository;
