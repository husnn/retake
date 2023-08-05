import { Edit } from '@retake/core';
import { EntitySchema } from 'typeorm';

const EditSchema = new EntitySchema<Edit>({
  name: 'edits',
  columns: {
    id: {
      type: 'uuid',
      generated: 'uuid',
      primary: true
    }
  }
});

export default EditSchema;
