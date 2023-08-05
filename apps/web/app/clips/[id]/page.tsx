'use client';

import { getVideoMetadata } from '@remotion/media-utils';
import { Player } from '@remotion/player';
import { Clip } from '@web/remotion/clip';
import { useEffect, useState } from 'react';

const testClip =
  // 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  'https://choppity-assets.s3.eu-west-2.amazonaws.com/video/whDpJbapAASzSYnLna5w8';

export default function Page() {
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    getVideoMetadata(testClip).then(({ width, height, durationInSeconds }) => {
      setSize({
        width: 1080,
        height: 1920
      });

      setDuration(durationInSeconds);
    });
  }, [setSize, setDuration]);

  return (
    <div>
      {size && (
        <Player
          component={Clip}
          inputProps={{
            headline: 'A big headline'
          }}
          style={{
            width: 350
          }}
          durationInFrames={Math.floor(duration * 30)}
          fps={30}
          compositionWidth={size?.width || 1920}
          compositionHeight={size?.height || 1080}
          controls
          alwaysShowControls
          autoPlay
          initiallyMuted
        />
      )}
    </div>
  );
}
