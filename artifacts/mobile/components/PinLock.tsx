import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export function PinLock() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unlockWithPin } = useApp();
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  function handleKey(key: string) {
    if (key === "del") {
      setInput((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (input.length >= 4) return;
    const next = input + key;
    setInput(next);
    if (next.length === 4) {
      const ok = unlockWithPin(next);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(true);
        setTimeout(() => { setInput(""); setError(false); }, 600);
      }
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Enter PIN</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {error ? "Incorrect PIN" : "Enter your 4-digit PIN to unlock"}
      </Text>

      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  input.length > i
                    ? error
                      ? colors.destructive
                      : colors.primary
                    : colors.border,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.pad}>
        {PAD.map((key, idx) => {
          if (key === "") return <View key={idx} style={styles.padEmpty} />;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.padBtn, { backgroundColor: colors.card }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleKey(key); }}
              disabled={key === "del" && input.length === 0}
            >
              {key === "del" ? (
                <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
              ) : (
                <Text style={[styles.padKey, { color: colors.foreground }]}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    zIndex: 9999,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  dots: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 280,
    gap: 12,
    justifyContent: "center",
  },
  padBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  padEmpty: {
    width: 80,
    height: 80,
  },
  padKey: {
    fontSize: 26,
    fontFamily: "Inter_400Regular",
  },
});
