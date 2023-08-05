import { Render, RenderState } from '@retake/core';
import { EntitySchema } from 'typeorm';

const RenderSchema = new EntitySchema<Render>({
  name: 'renders',
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
    videoId: {
      type: 'uuid',
      name: 'video_id'
    },
    status: {
      type: 'enum',
      enum: RenderState
    },
    editId: {
      type: 'uuid',
      name: 'edit_id'
    },
    outputFileId: {
      type: 'text',
      name: 'output_file_id',
      nullable: true
    }
  },
  relations: {
    video: {
      type: 'many-to-one',
      target: 'videos',
      joinColumn: {
        name: 'video_id',
        referencedColumnName: 'id'
      }
    },
    edit: {
      type: 'many-to-one',
      target: 'edits',
      joinColumn: {
        name: 'edit_id',
        referencedColumnName: 'id'
      }
    },
    outputFile: {
      type: 'many-to-one',
      target: 'files',
      joinColumn: {
        name: 'output_file_id',
        referencedColumnName: 'id'
      }
    }
  }
});

export default RenderSchema;
