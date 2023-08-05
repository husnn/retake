import { VideoState } from '@retake/shared';
import File from './File';
import User from './User';

export class Video {
  id: string;
  dateCreated: Date;
  userId: string;
  user?: User;
  title: string;
  status: VideoState;
  fileId?: string;
  file?: File;
}

export default Video;
