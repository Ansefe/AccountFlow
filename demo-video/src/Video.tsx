import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { SCENE_DURATIONS } from "./styles";
import { IntroScene } from "./scenes/IntroScene";
import { LoginScene } from "./scenes/LoginScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { ProfilesScene } from "./scenes/ProfilesScene";
import { AnalyticsScene } from "./scenes/AnalyticsScene";
import { PricingScene } from "./scenes/PricingScene";
import { OutroScene } from "./scenes/OutroScene";

// Calculate cumulative offsets
const offsets = {
  intro: 0,
  login: SCENE_DURATIONS.intro,
  dashboard: SCENE_DURATIONS.intro + SCENE_DURATIONS.login,
  profiles: SCENE_DURATIONS.intro + SCENE_DURATIONS.login + SCENE_DURATIONS.dashboard,
  analytics:
    SCENE_DURATIONS.intro +
    SCENE_DURATIONS.login +
    SCENE_DURATIONS.dashboard +
    SCENE_DURATIONS.profiles,
  pricing:
    SCENE_DURATIONS.intro +
    SCENE_DURATIONS.login +
    SCENE_DURATIONS.dashboard +
    SCENE_DURATIONS.profiles +
    SCENE_DURATIONS.analytics,
  outro:
    SCENE_DURATIONS.intro +
    SCENE_DURATIONS.login +
    SCENE_DURATIONS.dashboard +
    SCENE_DURATIONS.profiles +
    SCENE_DURATIONS.analytics +
    SCENE_DURATIONS.pricing,
};

// Transition wrapper that adds fade in/out between scenes
const SceneWithTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
}> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

export const AccountFlowDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0F" }}>
      {/* Scene 1: Intro */}
      <Sequence from={offsets.intro} durationInFrames={SCENE_DURATIONS.intro}>
        <SceneWithTransition durationInFrames={SCENE_DURATIONS.intro}>
          <IntroScene />
        </SceneWithTransition>
      </Sequence>

      {/* Scene 2: Login */}
      <Sequence from={offsets.login} durationInFrames={SCENE_DURATIONS.login}>
        <SceneWithTransition durationInFrames={SCENE_DURATIONS.login}>
          <LoginScene />
        </SceneWithTransition>
      </Sequence>

      {/* Scene 3: Dashboard */}
      <Sequence from={offsets.dashboard} durationInFrames={SCENE_DURATIONS.dashboard}>
        <SceneWithTransition durationInFrames={SCENE_DURATIONS.dashboard}>
          <DashboardScene />
        </SceneWithTransition>
      </Sequence>

      {/* Scene 4: Performance Profiles */}
      <Sequence from={offsets.profiles} durationInFrames={SCENE_DURATIONS.profiles}>
        <SceneWithTransition durationInFrames={SCENE_DURATIONS.profiles}>
          <ProfilesScene />
        </SceneWithTransition>
      </Sequence>

      {/* Scene 5: Analytics */}
      <Sequence from={offsets.analytics} durationInFrames={SCENE_DURATIONS.analytics}>
        <SceneWithTransition durationInFrames={SCENE_DURATIONS.analytics}>
          <AnalyticsScene />
        </SceneWithTransition>
      </Sequence>

      {/* Scene 6: Pricing */}
      <Sequence from={offsets.pricing} durationInFrames={SCENE_DURATIONS.pricing}>
        <SceneWithTransition durationInFrames={SCENE_DURATIONS.pricing}>
          <PricingScene />
        </SceneWithTransition>
      </Sequence>

      {/* Scene 7: Outro */}
      <Sequence from={offsets.outro} durationInFrames={SCENE_DURATIONS.outro}>
        <SceneWithTransition durationInFrames={SCENE_DURATIONS.outro}>
          <OutroScene />
        </SceneWithTransition>
      </Sequence>
    </AbsoluteFill>
  );
};
