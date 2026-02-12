import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles";

export const PricingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const plans = [
    {
      name: "Early Bird",
      price: "$6",
      period: "/mo",
      original: "$10/mo",
      badge: "40% OFF — Limited time",
      features: [
        "1,000 monthly tracking credits",
        "Performance dashboards",
        "Match history analysis",
      ],
      highlight: true,
    },
    {
      name: "Basic",
      price: "$10",
      period: "/mo",
      original: null,
      badge: null,
      features: [
        "1,000 monthly tracking credits",
        "Performance dashboards",
        "Cloud data storage",
      ],
      highlight: false,
    },
    {
      name: "Unlimited",
      price: "$30",
      period: "/mo",
      original: null,
      badge: null,
      features: [
        "Unlimited tracking & analysis",
        "Priority cloud storage",
        "Advanced data optimization",
      ],
      highlight: false,
    },
  ];

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
        padding: "0 60px",
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 40, opacity: titleOpacity }}>
        <h2 style={{ fontSize: 34, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
          Simple, Transparent Pricing
        </h2>
        <p style={{ fontSize: 15, color: colors.textSecondary, marginTop: 8 }}>
          Choose the plan that fits your competitive needs
        </p>
      </div>

      {/* Plan cards */}
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "stretch",
          width: "100%",
          maxWidth: 900,
          justifyContent: "center",
        }}
      >
        {plans.map((plan, i) => {
          const cardScale = spring({
            frame: frame - 15 - i * 8,
            fps,
            config: { damping: 14 },
          });

          return (
            <div
              key={i}
              style={{
                flex: 1,
                maxWidth: 280,
                background: colors.surface,
                border: `1px solid ${plan.highlight ? colors.warning : colors.border}`,
                borderRadius: 16,
                padding: "32px 24px",
                textAlign: "center",
                transform: `scale(${Math.max(0, cardScale)})`,
                position: "relative",
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "4px 14px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: colors.warning,
                    color: colors.bg,
                    whiteSpace: "nowrap",
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, marginBottom: 8 }}>
                {plan.name}
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 2 }}>
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    color: colors.textPrimary,
                  }}
                >
                  {plan.price}
                </span>
                <span style={{ fontSize: 16, color: colors.textSecondary }}>{plan.period}</span>
              </div>

              {plan.original && (
                <div
                  style={{
                    fontSize: 14,
                    color: colors.textMuted,
                    textDecoration: "line-through",
                    marginTop: 4,
                    marginBottom: 16,
                  }}
                >
                  {plan.original}
                </div>
              )}
              {!plan.original && <div style={{ height: 34 }} />}

              {/* Features */}
              <div style={{ textAlign: "left", marginTop: 8 }}>
                {plan.features.map((feature, fi) => (
                  <div
                    key={fi}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      fontSize: 13,
                      color: colors.textSecondary,
                    }}
                  >
                    <span style={{ color: colors.success, fontWeight: 700, fontSize: 13 }}>✓</span>
                    {feature}
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <div
                style={{
                  marginTop: 20,
                  padding: "10px 0",
                  borderRadius: 8,
                  background: plan.highlight
                    ? `linear-gradient(135deg, ${colors.accent}, #a78bfa)`
                    : colors.bg,
                  border: plan.highlight ? "none" : `1px solid ${colors.border}`,
                  color: plan.highlight ? "white" : colors.textSecondary,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Get Started
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment methods */}
      <div
        style={{
          marginTop: 32,
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ fontSize: 12, color: colors.textMuted }}>
          Secure payments powered by
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
          Lemon Squeezy
        </span>
        <span style={{ fontSize: 12, color: colors.textMuted }}>
          · Visa, Mastercard, PayPal, Apple Pay
        </span>
      </div>
    </div>
  );
};
