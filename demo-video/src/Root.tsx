import React from "react";
import { Composition } from "remotion";
import { AccountFlowDemo } from "./Video";
import { VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, TOTAL_DURATION } from "./styles";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AccountFlowDemo"
        component={AccountFlowDemo}
        durationInFrames={TOTAL_DURATION}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};
