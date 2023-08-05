import Edit from './Edit';
import File from './File';
import Video from './Video';

export enum RenderState {
  Started = 'started',
  Stopped = 'stopped',
  Terminated = 'terminated',
  Done = 'done'
}

export class Render {
  id: string;
  dateCreated: Date;
  videoId: string;
  video?: Video;
  status: RenderState;
  editId: string;
  edit?: Edit;
  outputFileId?: string;
  outputFile?: File;
}

export default Render;
