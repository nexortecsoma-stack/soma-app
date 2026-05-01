import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useAuth } from "@/hooks/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { theme } from "@/lib/theme";

export default function PrivateLayout() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) router.replace("/(public)/login");
  }, [session, loading]);

  if (loading || !session) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.bgDeep }}>
        <ActivityIndicator color={theme.colors.accentBright} size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F4F7FB" } }} />;
}
