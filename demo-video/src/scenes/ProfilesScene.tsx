import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { MockAppFrame } from "../components/MockAppFrame";

const eloData = [
  { name: "NA Diamond Player", elo: "Diamond", div: "2", lp: 67, server: "NA", status: "Available", eloColor: "#9B59B6" },
  { name: "EUW Platinum Analysis", elo: "Platinum", div: "1", lp: 45, server: "EUW", status: "Tracking", eloColor: "#1ABC9C" },
  { name: "KR Master Profile", elo: "Master", div: "", lp: 234, server: "KR", status: "Available", eloColor: "#E74C3C" },
  { name: "LAN Gold Stats", elo: "Gold", div: "3", lp: 12, server: "LAN", status: "Available", eloColor: "#FFD700" },
  { name: "BR Emerald Tracker", elo: "Emerald", div: "1", lp: 88, server: "BR", status: "Available", eloColor: "#2ECC71" },
  { name: "NA Challenger Data", elo: "Challenger", div: "", lp: 1100, server: "NA", status: "Available", eloColor: "#F1C40F" },
  { name: "EUW Diamond Analysis", elo: "Diamond", div: "4", lp: 23, server: "EUW", status: "Available", eloColor: "#9B59B6" },
  { name: "OCE Silver Study", elo: "Silver", div: "2", lp: 55, server: "OCE", status: "Maintenance", eloColor: "#A8B0B8" },
];

export const ProfilesScene: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const searchOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });

  return (
    <MockAppFrame activePage="profiles" pageTitle="Performance Profiles">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Search + Filters row */}
        <div
          style={{
            opacity: searchOpacity,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* Search bar */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "8px 14px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span style={{ fontSize: 13, color: colors.textMuted }}>Search profiles...</span>
          </div>

          {/* Filter dropdowns */}
          {["All Elos", "All Regions", "All Status"].map((label, i) => (
            <div
              key={i}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                color: colors.textSecondary,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {label}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          ))}
        </div>

        {/* Profile cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {eloData.map((profile, i) => {
            const cardOpacity = interpolate(frame, [15 + i * 5, 30 + i * 5], [0, 1], {
              extrapolateRight: "clamp",
            });
            const cardY = interpolate(frame, [15 + i * 5, 30 + i * 5], [20, 0], {
              extrapolateRight: "clamp",
            });

            const isTracking = profile.status === "Tracking";
            const isMaintenance = profile.status === "Maintenance";

            return (
              <div
                key={i}
                style={{
                  opacity: cardOpacity,
                  transform: `translateY(${cardY}px)`,
                  background: colors.surface,
                  border: `1px solid ${isTracking ? colors.accent + "40" : colors.border}`,
                  borderRadius: 12,
                  padding: 16,
                  position: "relative",
                }}
              >
                {/* Tracking overlay */}
                {isTracking && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: colors.accent + "20",
                      border: `1px solid ${colors.accent}40`,
                      borderRadius: 12,
                      padding: "2px 8px",
                      fontSize: 9,
                      color: colors.accent,
                      fontWeight: 600,
                    }}
                  >
                    TRACKING
                  </div>
                )}
                {isMaintenance && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: colors.warning + "20",
                      border: `1px solid ${colors.warning}40`,
                      borderRadius: 12,
                      padding: "2px 8px",
                      fontSize: 9,
                      color: colors.warning,
                      fontWeight: 600,
                    }}
                  >
                    UPDATING
                  </div>
                )}

                {/* Profile name */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 8,
                    paddingRight: isTracking || isMaintenance ? 60 : 0,
                  }}
                >
                  {profile.name}
                </div>

                {/* Elo badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: `${profile.eloColor}18`,
                    color: profile.eloColor,
                    fontSize: 11,
                    fontWeight: 600,
                    marginBottom: 8,
                    boxShadow: `0 0 12px ${profile.eloColor}20`,
                  }}
                >
                  {profile.elo} {profile.div} · {profile.lp} LP
                </div>

                {/* Server + Stats */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: colors.bg,
                      color: colors.textMuted,
                      fontWeight: 500,
                    }}
                  >
                    {profile.server}
                  </span>
                  {!isTracking && !isMaintenance && (
                    <div
                      style={{
                        fontSize: 10,
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: colors.accent,
                        color: "white",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Track
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MockAppFrame>
  );
};
