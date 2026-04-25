import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 160;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CX = SIZE / 2;
const CY = SIZE / 2;

interface BudgetRingProps {
  percentage: number;
  spent: number;
  remaining: number;
}

export function BudgetRing({ percentage, spent, remaining }: BudgetRingProps) {
  const colors = useColors();
  const clampedPct = Math.min(percentage, 100);
  const isOver = percentage > 100;
  const strokeColor = isOver ? colors.destructive : colors.primary;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clampedPct / 100, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedPct]);

  const animatedProps = useAnimatedProps(() => {
    if (Platform.OS === "web") {
      return {
        strokeDashoffset: CIRCUMFERENCE * (1 - clampedPct / 100),
      };
    }
    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        <Circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          stroke={colors.border}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={RADIUS}
          stroke={strokeColor}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${CX}, ${CY}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.percentText, { color: strokeColor }]}>
          {Math.round(clampedPct)}%
        </Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>used</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Spent</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            ${spent.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Left</Text>
          <Text
            style={[
              styles.infoValue,
              { color: isOver ? colors.destructive : colors.primary },
            ]}
          >
            ${Math.abs(remaining).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  svg: {},
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  percentText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  infoRow: {
    alignItems: "center",
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    width: 1,
    height: 28,
  },
});
