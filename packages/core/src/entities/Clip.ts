import Edit from './Edit';
import File from './File';
import Render from './Render';
import Video from './Video';

export class Clip {
  id: string;
  dateCreated: Date;
  videoId: string;
  video?: Video;
  title?: string;
  fileId: string;
  file?: File;
  previewFileId: string;
  previewFile?: File;
  durationSecs: number;
  editId?: string;
  edit?: Edit;
  editedAt?: Date;
  renderId?: string;
  render?: Render;
}

export default Clip;
