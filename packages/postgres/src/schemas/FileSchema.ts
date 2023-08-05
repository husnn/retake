import { File, FileProvider } from '@retake/core';
import { EntitySchema } from 'typeorm';

const FileSchema = new EntitySchema<File>({
  name: 'files',
  columns: {
    id: {
      type: 'bigint',
      generated: 'increment',
      primary: true
    },
    dateCreated: {
      type: 'timestamptz',
      name: 'date_created'
    },
    provider: {
      type: 'enum',
      enum: FileProvider
    },
    uri: {
      type: 'text'
    },
    byteSize: {
      type: 'bigint',
      name: 'byte_size'
    }
  }
});

export default FileSchema;
