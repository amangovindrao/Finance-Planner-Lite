import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Rect, Text as SvgText } from "react-native-svg";
import { CATEGORIES, CATEGORY_COLORS, Category } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function slicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const os = polarToCartesian(cx, cy, outerR, startAngle);
  const oe = polarToCartesian(cx, cy, outerR, endAngle);
  const is = polarToCartesian(cx, cy, innerR, endAngle);
  const ie = polarToCartesian(cx, cy, innerR, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${is.x} ${is.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ie.x} ${ie.y}`,
    "Z",
  ].join(" ");
}

interface PieChartProps {
  data: Record<Category, number>;
}

export function PieChartView({ data }: PieChartProps) {
  const colors = useColors();
  const SIZE = 220;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const OUTER_R = 85;
  const INNER_R = 50;

  const total = useMemo(
    () => Object.values(data).reduce((s, v) => s + v, 0),
    [data]
  );

  const slices = useMemo(() => {
    if (total === 0) return [];
    let currentAngle = 0;
    return CATEGORIES.filter((c) => data[c] > 0).map((cat) => {
      const pct = data[cat] / total;
      const sweep = pct * 360;
      const start = currentAngle;
      const end = currentAngle + sweep;
      currentAngle = end;
      return {
        cat,
        path: slicePath(CX, CY, OUTER_R, INNER_R, start, end - 0.5),
        color: CATEGORY_COLORS[cat],
        pct: Math.round(pct * 100),
      };
    });
  }, [data, total]);

  if (total === 0) {
    return (
      <View style={[styles.emptyChart, { borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No expenses this month
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.pieContainer}>
      <Svg width={SIZE} height={SIZE}>
        <G>
          {slices.map((s) => (
            <Path key={s.cat} d={s.path} fill={s.color} opacity={0.9} />
          ))}
        </G>
      </Svg>
      <View style={styles.legend}>
        {CATEGORIES.filter((c) => data[c] > 0).map((cat) => (
          <View key={cat} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>
              {cat}
            </Text>
            <Text style={[styles.legendValue, { color: colors.foreground }]}>
              ${data[cat].toFixed(0)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue?: number;
  barColor?: string;
}

export function BarChartView({ data, maxValue, barColor }: BarChartProps) {
  const colors = useColors();
  const HEIGHT = 140;
  const BAR_WIDTH = 28;
  const GAP = 10;
  const PADDING_LEFT = 36;
  const PADDING_BOTTOM = 28;
  const chartHeight = HEIGHT - PADDING_BOTTOM;
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const totalWidth = PADDING_LEFT + data.length * (BAR_WIDTH + GAP);

  return (
    <View>
      <Svg width={totalWidth} height={HEIGHT}>
        {data.map((d, i) => {
          const barH = max > 0 ? (d.value / max) * chartHeight : 0;
          const x = PADDING_LEFT + i * (BAR_WIDTH + GAP);
          const y = chartHeight - barH;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={Math.max(barH, 2)}
                fill={barColor ?? colors.primary}
                rx={4}
                opacity={0.85}
              />
              <SvgText
                x={x + BAR_WIDTH / 2}
                y={HEIGHT - 6}
                fontSize={9}
                fill={colors.mutedForeground}
                textAnchor="middle"
                fontFamily="Inter_400Regular"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyChart: {
    height: 160,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  pieContainer: {
    alignItems: "center",
  },
  legend: {
    width: "100%",
    gap: 6,
    marginTop: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  legendValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
