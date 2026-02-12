import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { MockAppFrame } from "../components/MockAppFrame";

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();

  const card1Opacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });
  const card2Opacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });
  const card3Opacity = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: "clamp" });
  const card1Y = interpolate(frame, [5, 20], [20, 0], { extrapolateRight: "clamp" });
  const card2Y = interpolate(frame, [15, 30], [20, 0], { extrapolateRight: "clamp" });
  const card3Y = interpolate(frame, [25, 40], [20, 0], { extrapolateRight: "clamp" });

  const quickActionsOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" });
  const tableOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" });

  // Animated counter
  const creditCount = Math.round(interpolate(frame, [5, 35], [0, 1760], { extrapolateRight: "clamp" }));

  // Timer animation
  const timerMinutes = Math.round(interpolate(frame, [25, 40], [60, 31], { extrapolateRight: "clamp" }));
  const timerSeconds = Math.round(interpolate(frame, [40, 150], [59, 0], { extrapolateRight: "clamp" }));
  const progressPercent = interpolate(frame, [25, 150], [0, 48], { extrapolateRight: "clamp" });

  return (
    <MockAppFrame activePage="dashboard" pageTitle="Dashboard">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Top stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {/* Tracking Credits Card */}
          <div
            style={{
              opacity: card1Opacity,
              transform: `translateY(${card1Y}px)`,
              borderRadius: 12,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              padding: "20px 20px",
            }}
          >
            <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>
              Tracking Credits
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, color: colors.warning }}>🪙</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: fonts.mono,
                  color: colors.textPrimary,
                }}
              >
                {creditCount}
              </span>
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              ~ ${(creditCount * 0.01).toFixed(2)} USD
            </div>
          </div>

          {/* Current Plan Card */}
          <div
            style={{
              opacity: card2Opacity,
              transform: `translateY(${card2Y}px)`,
              borderRadius: 12,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              padding: "20px 20px",
            }}
          >
            <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>
              Current Plan
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, color: colors.accent }}>◈</span>
              <span style={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>
                Early Bird
              </span>
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              Expires: 3/10/2026
            </div>
          </div>

          {/* Active Session Card */}
          <div
            style={{
              opacity: card3Opacity,
              transform: `translateY(${card3Y}px)`,
              borderRadius: 12,
              background: colors.surface,
              border: `1px solid ${colors.accent}30`,
              padding: "20px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: `${colors.accent}06` }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>
                Active Tracking: Diamond Analysis
              </div>
              <div
                style={{
                  textAlign: "center",
                  margin: "8px 0",
                }}
              >
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    fontFamily: fonts.mono,
                    color: colors.textPrimary,
                    letterSpacing: 2,
                  }}
                >
                  00:{String(timerMinutes).padStart(2, "0")}:{String(timerSeconds % 60).padStart(2, "0")}
                </span>
                <div style={{ fontSize: 10, color: colors.textSecondary }}>Remaining</div>
              </div>
              {/* Progress bar */}
              <div
                style={{
                  width: "100%",
                  height: 3,
                  borderRadius: 2,
                  background: colors.bg,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    borderRadius: 2,
                    background: colors.accent,
                    transition: "width 0.1s",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: colors.textSecondary,
                }}
              >
                <span>Region: <span style={{ color: colors.textPrimary }}>NA</span></span>
                <span>Elo: <span style={{ color: colors.eloDiamond, fontWeight: 600 }}>Diamond 2</span></span>
              </div>
              {/* Buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 6,
                    background: colors.accent,
                    textAlign: "center",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ▶ View Stats
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 6,
                    background: colors.error + "20",
                    border: `1px solid ${colors.error}40`,
                    textAlign: "center",
                    color: colors.error,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ⏹ Stop
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ opacity: quickActionsOpacity }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: colors.textPrimary,
              marginBottom: 12,
            }}
          >
            Quick Actions
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            {[
              { icon: "📊", label: "New Analysis", color: colors.accent },
              { icon: "🔄", label: "Top Up Credits", color: colors.success },
              { icon: "📋", label: "Match History", color: colors.info },
              { icon: "💬", label: "Support", color: colors.warning },
            ].map(({ icon, label, color }, i) => (
              <div
                key={i}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "18px 12px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 24 }}>{icon}</span>
                <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Table */}
        <div style={{ opacity: tableOpacity }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: colors.textPrimary,
              marginBottom: 12,
            }}
          >
            Recent Activity
          </h3>
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 1fr 1fr",
                padding: "10px 16px",
                borderBottom: `1px solid ${colors.border}`,
                fontSize: 11,
                color: colors.textMuted,
                fontWeight: 600,
              }}
            >
              <span>Date</span>
              <span>Profile</span>
              <span>Duration</span>
              <span>Status</span>
            </div>
            {/* Table rows */}
            {[
              { date: "2/11/2026, 10:52 PM", profile: "NA Diamond Analysis", dur: "60m", status: "Active", statusColor: colors.accent },
              { date: "2/11/2026, 9:31 PM", profile: "EUW Platinum Tracking", dur: "60m", status: "Completed", statusColor: colors.success },
              { date: "2/9/2026, 11:19 PM", profile: "KR Master Analysis", dur: "60m", status: "Completed", statusColor: colors.success },
              { date: "2/9/2026, 10:53 PM", profile: "LAN Gold Tracking", dur: "60m", status: "Completed", statusColor: colors.success },
            ].map(({ date, profile, dur, status, statusColor }, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr 1fr",
                  padding: "10px 16px",
                  borderBottom: i < 3 ? `1px solid ${colors.border}` : "none",
                  fontSize: 12,
                  color: colors.textSecondary,
                }}
              >
                <span style={{ fontFamily: fonts.mono, fontSize: 11 }}>{date}</span>
                <span style={{ color: colors.textPrimary }}>{profile}</span>
                <span style={{ fontFamily: fonts.mono }}>{dur}</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 10px",
                    borderRadius: 20,
                    background: `${statusColor}18`,
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: 600,
                    width: "fit-content",
                  }}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockAppFrame>
  );
};
