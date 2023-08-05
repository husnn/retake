import { RenderRepository as IRenderRepository, Render } from '@retake/core';

import RenderSchema from '../schemas/RenderSchema';
import Repository from './Repository';

export class RenderRepository
  extends Repository<Render>
  implements IRenderRepository
{
  constructor() {
    super(RenderSchema);
  }
}

export default RenderRepository;
