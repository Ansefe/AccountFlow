import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles";

export const LoginScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const formScale = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const inputFill = interpolate(frame, [30, 55], [0, 1], {
    extrapolateRight: "clamp",
  });
  const buttonGlow = interpolate(frame, [60, 75], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.bg,
        fontFamily: fonts.inter,
        opacity: containerOpacity,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background gradient blobs */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}30 0%, transparent 70%)`,
          top: "20%",
          left: "15%",
          filter: "blur(100px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, #a78bfa25 0%, transparent 70%)`,
          bottom: "20%",
          right: "20%",
          filter: "blur(80px)",
        }}
      />

      {/* Login card */}
      <div
        style={{
          transform: `scale(${Math.max(0, formScale)})`,
          background: `${colors.surface}ee`,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: "48px 40px",
          width: 400,
          backdropFilter: "blur(20px)",
          boxShadow: `0 25px 60px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
            }}
          >
            AccountFlow
          </h2>
          <p
            style={{
              fontSize: 14,
              color: colors.textMuted,
              marginTop: 6,
            }}
          >
            Sign in to your analytics dashboard
          </p>
        </div>

        {/* Email field */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              display: "block",
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Email
          </label>
          <div
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 14,
              color: colors.textPrimary,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ opacity: inputFill }}>player@example.com</span>
            <span
              style={{
                opacity: inputFill < 1 ? 1 : 0,
                color: colors.textMuted,
              }}
            >
              {inputFill < 0.1 ? "Enter your email..." : ""}
            </span>
          </div>
        </div>

        {/* Password field */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              display: "block",
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Password
          </label>
          <div
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 14,
              color: colors.textPrimary,
            }}
          >
            <span style={{ opacity: inputFill }}>••••••••••</span>
          </div>
        </div>

        {/* Sign in button */}
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
            borderRadius: 8,
            padding: "12px 0",
            textAlign: "center",
            fontWeight: 600,
            fontSize: 15,
            color: "white",
            cursor: "pointer",
            boxShadow:
              buttonGlow > 0
                ? `0 0 ${30 * buttonGlow}px ${colors.accent}60`
                : "none",
          }}
        >
          Sign In
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "20px 0",
          }}
        >
          <div
            style={{ flex: 1, height: 1, background: colors.border }}
          />
          <span
            style={{ fontSize: 12, color: colors.textMuted }}
          >
            or
          </span>
          <div
            style={{ flex: 1, height: 1, background: colors.border }}
          />
        </div>

        {/* Discord button */}
        <div
          style={{
            background: "#5865F2",
            borderRadius: 8,
            padding: "12px 0",
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
          </svg>
          Continue with Discord
        </div>
      </div>
    </div>
  );
};
