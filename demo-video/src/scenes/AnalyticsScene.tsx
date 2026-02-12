import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { MockAppFrame } from "../components/MockAppFrame";

export const AnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const panel1Opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const panel2Opacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });
  const chartOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });

  // Animate bar heights
  const barMultiplier = interpolate(frame, [25, 55], [0, 1], { extrapolateRight: "clamp" });

  const winRateData = [65, 58, 72, 61, 78, 55, 69, 74, 63, 80, 71, 67];
  const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

  return (
    <MockAppFrame activePage="analytics" pageTitle="Performance Analytics">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Stats overview grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 12,
            opacity: panel1Opacity,
          }}
        >
          {[
            { label: "Win Rate", value: "68.4%", change: "+3.2%", positive: true, color: colors.success },
            { label: "Average KDA", value: "4.21", change: "+0.45", positive: true, color: colors.info },
            { label: "CS/min", value: "8.7", change: "+0.3", positive: true, color: colors.accent },
            { label: "Vision Score", value: "42.1", change: "-2.1", positive: false, color: colors.warning },
          ].map(({ label, value, change, positive, color }, i) => (
            <div
              key={i}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: fonts.mono,
                    color: colors.textPrimary,
                  }}
                >
                  {value}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: positive ? colors.success : colors.error,
                  }}
                >
                  {positive ? "↑" : "↓"} {change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts area */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          {/* Bar chart - Win Rate History */}
          <div
            style={{
              opacity: chartOpacity,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: colors.textPrimary,
                marginBottom: 16,
              }}
            >
              Win Rate Trend (12 months)
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 6,
                height: 140,
                paddingBottom: 24,
                position: "relative",
              }}
            >
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((pct) => (
                <div
                  key={pct}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 24 + (pct / 100) * 116,
                    height: 1,
                    background: `${colors.border}60`,
                  }}
                />
              ))}
              {winRateData.map((value, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "70%",
                      height: (value / 100) * 116 * barMultiplier,
                      borderRadius: "4px 4px 0 0",
                      background:
                        value >= 70
                          ? `linear-gradient(to top, ${colors.success}80, ${colors.success})`
                          : value >= 60
                              ? `linear-gradient(to top, ${colors.accent}80, ${colors.accent})`
                              : `linear-gradient(to top, ${colors.warning}80, ${colors.warning})`,
                      transition: "height 0.3s",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: colors.textMuted,
                      position: "absolute",
                      bottom: 0,
                    }}
                  >
                    {months[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Stats breakdown */}
          <div
            style={{
              opacity: panel2Opacity,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Rank Distribution */}
            <div
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.textPrimary,
                  marginBottom: 12,
                }}
              >
                Tracked Profiles by Rank
              </div>
              {[
                { elo: "Challenger", count: 3, color: "#F1C40F", pct: 3 },
                { elo: "Master", count: 8, color: "#E74C3C", pct: 8 },
                { elo: "Diamond", count: 25, color: "#9B59B6", pct: 25 },
                { elo: "Platinum", count: 30, color: "#1ABC9C", pct: 30 },
                { elo: "Gold", count: 22, color: "#FFD700", pct: 22 },
                { elo: "Silver+", count: 12, color: "#A8B0B8", pct: 12 },
              ].map(({ elo, count, color, pct }, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ width: 60, fontSize: 10, color, fontWeight: 600 }}>
                    {elo}
                  </span>
                  <div style={{ flex: 1, height: 6, background: colors.bg, borderRadius: 3 }}>
                    <div
                      style={{
                        width: `${pct * barMultiplier}%`,
                        height: "100%",
                        background: color,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: colors.textMuted, width: 20, textAlign: "right" }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>

            {/* Top performance spot */}
            <div
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.textPrimary,
                  marginBottom: 10,
                }}
              >
                Top Performers
              </div>
              {[
                { name: "NA Challenger", wr: "82%", color: "#F1C40F" },
                { name: "KR Master", wr: "76%", color: "#E74C3C" },
                { name: "EUW Diamond", wr: "74%", color: "#9B59B6" },
              ].map(({ name, wr, color }, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom:
                      i < 2 ? `1px solid ${colors.border}` : "none",
                  }}
                >
                  <span style={{ fontSize: 11, color: colors.textSecondary }}>
                    {name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: fonts.mono,
                      color,
                    }}
                  >
                    {wr}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MockAppFrame>
  );
};
