import { VideoRepository as IVideoRepository, Video } from '@retake/core';

import VideoSchema from '../schemas/VideoSchema';
import Repository from './Repository';

export class VideoRepository
  extends Repository<Video>
  implements IVideoRepository
{
  constructor() {
    super(VideoSchema);
  }
}

export default VideoRepository;
