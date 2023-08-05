import { Video } from '@retake/core';
import { VideoState } from '@retake/shared';
import { EntitySchema } from 'typeorm';

const VideoSchema = new EntitySchema<Video>({
  name: 'videos',
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
    userId: {
      type: 'text',
      name: 'user_id'
    },
    title: {
      type: 'text'
    },
    status: {
      type: 'enum',
      enum: VideoState,
      default: VideoState.Created
    },
    fileId: {
      type: 'bigint',
      name: 'file_id',
      nullable: true
    }
  },
  relations: {
    user: {
      type: 'many-to-one',
      target: 'users',
      joinColumn: {
        name: 'user_id',
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
    }
  }
});

export default VideoSchema;
