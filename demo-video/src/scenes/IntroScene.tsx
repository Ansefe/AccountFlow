import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../styles";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const titleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateRight: "clamp",
  });
  const badgeOpacity = interpolate(frame, [55, 75], [0, 1], {
    extrapolateRight: "clamp",
  });
  const badgeY = interpolate(frame, [55, 75], [20, 0], {
    extrapolateRight: "clamp",
  });

  // Gradient glow animation
  const glowOpacity = interpolate(
    frame,
    [0, 60, 120],
    [0, 0.4, 0.2],
    { extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: colors.bg,
        fontFamily: fonts.inter,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background gradient glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}40 0%, transparent 70%)`,
          opacity: glowOpacity,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(80px)",
        }}
      />

      {/* Logo icon */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 60px ${colors.accent}50`,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 52,
          fontWeight: 800,
          opacity: titleOpacity,
          background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: -1,
          margin: 0,
        }}
      >
        AccountFlow
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 20,
          color: colors.textSecondary,
          opacity: subtitleOpacity,
          marginTop: 12,
          fontWeight: 400,
          letterSpacing: 0.5,
        }}
      >
        Competitive Gaming Performance Analytics
      </p>

      {/* Badge */}
      <div
        style={{
          opacity: badgeOpacity,
          transform: `translateY(${badgeY}px)`,
          marginTop: 28,
          display: "flex",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: "8px 18px",
            borderRadius: 20,
            background: colors.accent,
            color: "white",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Desktop App for Windows
        </div>
        <div
          style={{
            padding: "8px 18px",
            borderRadius: 20,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Real-Time Analytics
        </div>
      </div>
    </div>
  );
};
