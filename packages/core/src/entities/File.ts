export enum FileProvider {
  S3 = 's3'
}

export class File {
  id: string;
  dateCreated: Date;
  provider: FileProvider;
  uri: string;
  byteSize: string;
}

export default File;
