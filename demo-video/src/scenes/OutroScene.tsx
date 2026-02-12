import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const textOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const urlOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });

  // Fade out at end
  const fadeOut = interpolate(frame, [70, 90], [1, 0], { extrapolateRight: "clamp" });

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
        opacity: fadeOut,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}30 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(100px)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 50px ${colors.accent}40`,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      <h1
        style={{
          fontSize: 44,
          fontWeight: 800,
          background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
          opacity: textOpacity,
        }}
      >
        AccountFlow
      </h1>

      <p
        style={{
          fontSize: 18,
          color: colors.textSecondary,
          marginTop: 8,
          opacity: textOpacity,
        }}
      >
        Level up your game with data
      </p>

      <div
        style={{
          marginTop: 32,
          opacity: urlOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
            color: "white",
            fontSize: 15,
            fontWeight: 600,
            boxShadow: `0 0 30px ${colors.accent}40`,
          }}
        >
          Download Now — Free Trial
        </div>
        <span style={{ fontSize: 13, color: colors.textMuted }}>
          ansefe.github.io/AccountFlow
        </span>
      </div>
    </div>
  );
};
