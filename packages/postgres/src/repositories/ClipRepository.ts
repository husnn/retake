import { Clip, ClipRepository as IClipRepository } from '@retake/core';

import ClipSchema from '../schemas/ClipSchema';
import Repository from './Repository';

export class ClipRepository
  extends Repository<Clip>
  implements IClipRepository
{
  constructor() {
    super(ClipSchema);
  }
}

export default ClipRepository;
