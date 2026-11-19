import { ComponentRef, ReactNode, RefObject } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

type Props = {
  children: ReactNode;
  backgroundColor?: string;
  // optional, lets a screen scroll itself (e.g. scrollRef.current?.scrollToEnd())
  scrollRef?: RefObject<ComponentRef<typeof ScrollView> | null>;
};

// Use this as the root of every form screen:
// - moves content above the keyboard
// - scrolls when the content is taller than the screen
// - tapping outside an input closes the keyboard
export default function ScreenContainer({ children, backgroundColor = colors.lightGray, scrollRef }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>{children}</View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
