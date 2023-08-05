import { AbsoluteFill, OffthreadVideo } from 'remotion';
import z from 'zod';

const testClip =
  'https://choppity-assets.s3.eu-west-2.amazonaws.com/video/whDpJbapAASzSYnLna5w8';

export const ClipSchema = z.object({
  headline: z.string()
});

type ClipProps = z.infer<typeof ClipSchema>;

export const Clip: React.FC<ClipProps> = ({ headline }: ClipProps) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'white' }}>
      <AbsoluteFill>
        <OffthreadVideo
          src={testClip}
          style={{
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <h1
          style={{
            width: '100%',
            color: 'red',
            position: 'absolute',
            bottom: 200,
            textAlign: 'center',
            fontSize: 100
          }}
        >
          {headline}
        </h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
