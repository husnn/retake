import { Edit, EditRepository as IEditRepository } from '@retake/core';

import EditSchema from '../schemas/EditSchema';
import Repository from './Repository';

export class EditRepository
  extends Repository<Edit>
  implements IEditRepository
{
  constructor() {
    super(EditSchema);
  }
}

export default EditRepository;
