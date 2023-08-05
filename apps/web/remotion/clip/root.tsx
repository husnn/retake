import { getVideoMetadata } from '@remotion/media-utils';
import { Composition, registerRoot } from 'remotion';
import { Clip, ClipSchema } from '.';

const testClip =
  'https://choppity-assets.s3.eu-west-2.amazonaws.com/video/whDpJbapAASzSYnLna5w8';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Clip"
        component={Clip}
        schema={ClipSchema}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          headline: 'A big headline'
        }}
        calculateMetadata={async () => {
          const { width, height, durationInSeconds } = await getVideoMetadata(
            testClip
          );
          return {
            width,
            height,
            durationInFrames: Math.floor(durationInSeconds * 30)
          };
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
