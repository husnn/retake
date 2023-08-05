import { File } from '../entities';
import Repository from './Repository';

export interface FileRepository extends Repository<File> {}

export default FileRepository;
