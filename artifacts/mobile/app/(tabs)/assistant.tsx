import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { fmt } from "@/utils/currency";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const SUGGESTIONS = [
  "Is mahine kitna kharcha hua?",
  "Food pe kitna gaya?",
  "Mera balance kya hai?",
  "Budget mein hoon kya?",
  "Paisa bachane ke tips do",
];

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

function buildReply(
  input: string,
  {
    totalSpent,
    budget,
    remaining,
    pct,
    categoryTotals,
    totalBalance,
    accounts,
    loans,
    userName,
    streak,
    topCategory,
  }: {
    totalSpent: number;
    budget: number;
    remaining: number;
    pct: number;
    categoryTotals: Record<string, number>;
    totalBalance: number;
    accounts: { name: string; balance: number }[];
    loans: { personName: string; amount: number; type: string; settled: boolean }[];
    userName: string;
    streak: number;
    topCategory: string;
  }
): string {
  const t = input.toLowerCase();
  const name = userName ? userName.split(" ")[0] : "yaar";

  if (/kitna.*(kharcha|spend|spent|gaya|kharch)|(kharcha|spend|spent).*kitna/i.test(t)) {
    if (/food|khaana|khana/.test(t)) {
      return `${name}, food pe is mahine ${fmt(categoryTotals["Food"] ?? 0)} gaya hai. ${(categoryTotals["Food"] ?? 0) > 4000 ? "Thoda zyada ho gaya bhai 😅" : "Theek hai, manageable hai!"}`;
    }
    if (/transport|uber|ola|bus|auto|ride/.test(t)) {
      return `Transport pe ${fmt(categoryTotals["Transport"] ?? 0)} gaya is mahine. ${(categoryTotals["Transport"] ?? 0) > 1500 ? "Kabhi kabhi metro le liya karo 😄" : "Bilkul sahi hai!"}`;
    }
    if (/shopping|kapde|clothes/.test(t)) {
      return `Shopping pe ${fmt(categoryTotals["Shopping"] ?? 0)} spend kiya. ${(categoryTotals["Shopping"] ?? 0) > 3000 ? "Thodi shopping bandi karo 🛍️" : "Good control!"}`;
    }
    if (/education|padhai|books|course/.test(t)) {
      return `Education pe ${fmt(categoryTotals["Education"] ?? 0)} gaya — padhoge to hi aage badhoge! 📚`;
    }
    return `${name}, is mahine total ${fmt(totalSpent)} kharcha hua hai. Budget ${fmt(budget)} tha, to ${pct.toFixed(0)}% use ho gaya.`;
  }

  if (/balance|kitna.*bacha|paisa.*bacha|account/i.test(t)) {
    if (accounts.length === 0) {
      return `Bhai, abhi koi account add nahi kiya. Settings mein jaake account add karo!`;
    }
    const lines = accounts.map((a) => `${a.name}: ${fmt(a.balance)}`).join(", ");
    return `Tera total balance ${fmt(totalBalance)} hai. Breakdown: ${lines}.`;
  }

  if (/budget.*(mein|main|me)|kya.*budget|(over|exceed|baad|zyada).*budget/i.test(t)) {
    if (pct >= 100) {
      return `Oops ${name}! Budget exceed ho gaya. ${fmt(totalSpent)} kharcha, budget sirf ${fmt(budget)} tha. Next month better karte hain! 💪`;
    } else if (pct >= 80) {
      return `${name} careful! Budget ka ${pct.toFixed(0)}% use ho gaya. Sirf ${fmt(remaining)} bachaa hai — sambhal ke!`;
    } else {
      return `Haan bhai, budget mein ho! ${fmt(remaining)} abhi bhi bachaa hai. ${pct.toFixed(0)}% use hua, on track ho! ✅`;
    }
  }

  if (/remaining|bachaa|bacha|left|kitna.*baki/i.test(t)) {
    return `Is mahine ${fmt(remaining)} bachaa hai budget mein. Total ${fmt(totalSpent)} kharcha hua ${fmt(budget)} budget mein se.`;
  }

  if (/loan|udhaar|diya|liya|given|taken|borrow/i.test(t)) {
    const activeLoans = loans.filter((l) => !l.settled);
    if (activeLoans.length === 0) {
      return `Tera koi pending udhaar nahi hai. Clean slate! 🎉`;
    }
    const lent = activeLoans.filter((l) => l.type === "lent");
    const borrowed = activeLoans.filter((l) => l.type === "borrowed");
    let reply = `Udhaar ka hisaab:\n`;
    if (lent.length > 0) reply += `Tune diya: ${lent.map((l) => `${l.personName} (${fmt(l.amount)})`).join(", ")}\n`;
    if (borrowed.length > 0) reply += `Tune liya: ${borrowed.map((l) => `${l.personName} (${fmt(l.amount)})`).join(", ")}`;
    return reply.trim();
  }

  if (/tip|advice|bachao|savings|save|invest|suggestion/i.test(t)) {
    const tips: string[] = [];
    if ((categoryTotals["Food"] ?? 0) > 4000) tips.push("Zomato/Swiggy thoda kam karo, ghar ka khana healthy bhi hai aur sasta bhi 🍱");
    if ((categoryTotals["Transport"] ?? 0) > 1500) tips.push("Metro ya bus ka zyada use karo — cab pe zyada jaa raha paisa 🚇");
    if ((categoryTotals["Shopping"] ?? 0) > 3000) tips.push("Wishlist banao, sale ka wait karo — impulse buying mat karo 🛍️");
    if (remaining < 0) tips.push("Budget exceed ho gaya! Ek hafte ka spending freeze try karo 🥶");
    if (tips.length === 0) tips.push("Consistent raho! Har expense track karte raho 📊", "Emergency fund banao — 3 months ka kharcha side mein rakho 💰", "SIP shuru karo, chote amount se bhi chalta hai 📈");
    return `${name}, kuch tips:\n• ${tips.slice(0, 3).join("\n• ")}`;
  }

  if (/category|categories|breakdown|sabse zyada|top|most/i.test(t)) {
    const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return `Abhi koi expense nahi add kiya. Kuch add karo phir dekhte hain!`;
    const lines = entries.slice(0, 3).map(([cat, amt]) => `${cat}: ${fmt(amt)}`).join(", ");
    return `Is mahine sabse zyada ${topCategory} pe gaya. Breakdown: ${lines}.`;
  }

  if (/streak|log|consistent|din/i.test(t)) {
    if (streak === 0) return `Abhi tak koi expense log nahi kiya. Pehla expense add karo!`;
    return `Wah ${name}! ${streak} din se expenses track kar raha hai tu. Keep it up! 🔥`;
  }

  if (/hello|hi|hey|namaste|hii|helo/i.test(t)) {
    return `Namaste ${name}! 👋 Main tera AI finance assistant hoon. Puch kuch bhi — kharcha, balance, tips, udhaar — sab ke baare mein bataunga!`;
  }

  if (/thank|shukriya|dhanyavaad|thanks/i.test(t)) {
    return `Koi baat nahi ${name}! Apna khayal rakho aur paisa bhi 😄💰`;
  }

  return `${name}, samajh nahi aaya exactly 😅 Kuch aur puch — jaise "kitna kharcha hua", "balance kya hai", "budget mein hoon kya", ya "tips do"!`;
}

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    budget, accounts, loans, userName, streak, expenses, currentMonth,
  } = useApp();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      text: `Namaste ${userName ? userName.split(" ")[0] : "yaar"}! 👋 Main tera personal finance assistant hoon. Kharcha, balance, budget — sab ke baare mein puch!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const CATS = ["Food", "Transport", "Subscriptions", "Shopping", "Education", "Miscellaneous"];

  const getContextData = useCallback(() => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));
    const categoryTotals: Record<string, number> = {};
    CATS.forEach((cat) => {
      categoryTotals[cat] = monthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
    });
    const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const remaining = budget.totalAmount - totalSpent;
    const pct = budget.totalAmount > 0 ? (totalSpent / budget.totalAmount) * 100 : 0;
    const topEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const topCategory = topEntry ? topEntry[0] : "Miscellaneous";
    return { totalSpent, budget: budget.totalAmount, remaining, pct, categoryTotals, totalBalance, accounts, loans, userName, streak, topCategory };
  }, [expenses, currentMonth, accounts, loans, budget, userName, streak]);

  function sendMessage(text: string) {
    const userMsg: Message = { id: generateId(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const ctx = getContextData();
      const reply = buildReply(text, ctx);
      const assistantMsg: Message = { id: generateId(), role: "assistant", text: reply };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const styles = makeStyles(colors, topPad, bottomPad);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>Hinglish Finance Buddy</Text>
          </View>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          isTyping ? (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <Text style={styles.typingDots}>● ● ●</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={[styles.bubbleText, item.role === "user" ? styles.textUser : styles.textAssistant]}>
              {item.text}
            </Text>
          </View>
        )}
      />

      <View style={styles.suggestRow}>
        {SUGGESTIONS.map((s, i) => (
          <Pressable key={i} style={styles.suggestChip} onPress={() => sendMessage(s)}>
            <Text style={styles.suggestText} numberOfLines={1}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Kuch bhi puch..."
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={() => { if (input.trim()) sendMessage(input.trim()); }}
          returnKeyType="send"
          multiline={false}
        />
        <Pressable
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={() => { if (input.trim()) sendMessage(input.trim()); }}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={18} color={input.trim() ? "#fff" : colors.mutedForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number, bottomPad: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: topPad },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatarWrap: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    },
    avatarEmoji: { fontSize: 20 },
    headerTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
    headerSub: { color: colors.mutedForeground, fontSize: 12 },
    onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22c55e" },
    list: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    bubble: {
      maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
      marginBottom: 6,
    },
    bubbleUser: { backgroundColor: colors.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
    bubbleAssistant: { backgroundColor: colors.card, alignSelf: "flex-start", borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    textUser: { color: "#fff" },
    textAssistant: { color: colors.foreground },
    typingDots: { color: colors.mutedForeground, fontSize: 18, letterSpacing: 4 },
    suggestRow: {
      flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 6,
      flexWrap: "nowrap",
    },
    suggestChip: {
      backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6,
      borderWidth: 1, borderColor: colors.border, maxWidth: 150,
    },
    suggestText: { color: colors.mutedForeground, fontSize: 11 },
    inputRow: {
      flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
      paddingBottom: bottomPad + 8, paddingTop: 8,
      borderTopWidth: 1, borderTopColor: colors.border, gap: 8,
    },
    input: {
      flex: 1, backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: 16,
      paddingVertical: 10, color: colors.foreground, fontSize: 14, borderWidth: 1, borderColor: colors.border,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    },
    sendBtnDisabled: { backgroundColor: colors.card },
  });
}
