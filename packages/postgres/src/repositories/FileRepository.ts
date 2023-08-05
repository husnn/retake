import { File, FileRepository as IFileRepository } from '@retake/core';

import FileSchema from '../schemas/FileSchema';
import Repository from './Repository';

export class FileRepository
  extends Repository<File>
  implements IFileRepository
{
  constructor() {
    super(FileSchema);
  }
}

export default FileRepository;
