import { Clip } from '@retake/core';
import { EntitySchema } from 'typeorm';

const ClipSchema = new EntitySchema<Clip>({
  name: 'clips',
  columns: {
    id: {
      type: 'text',
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
    title: {
      type: 'text',
      nullable: true
    },
    fileId: {
      type: 'bigint',
      name: 'file_id'
    },
    previewFileId: {
      type: 'bigint',
      name: 'preview_file_id'
    },
    durationSecs: {
      type: 'numeric',
      precision: 6,
      scale: 3,
      name: 'duration_secs'
    },
    editId: {
      type: 'uuid',
      name: 'edit_id',
      nullable: true
    },
    editedAt: {
      type: 'timestamptz',
      name: 'edited_at',
      nullable: true
    },
    renderId: {
      type: 'uuid',
      name: 'render_id',
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
    file: {
      type: 'many-to-one',
      target: 'files',
      joinColumn: {
        name: 'file_id',
        referencedColumnName: 'id'
      }
    },
    previewFile: {
      type: 'many-to-one',
      target: 'files',
      joinColumn: {
        name: 'preview_file_id',
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
    render: {
      type: 'many-to-one',
      target: 'renders',
      joinColumn: {
        name: 'render_id',
        referencedColumnName: 'id'
      }
    }
  }
});

export default ClipSchema;
