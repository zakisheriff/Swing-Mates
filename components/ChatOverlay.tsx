import * as Haptics from "expo-haptics";
import { MessageSquare, Send, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import socketService from "../services/socket";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BUTTON_SIZE = 48;

interface Message {
  id: string;
  userId: string;
  message: string;
  timestamp: number;
}

interface ChatProps {
  roomId: string;
  userId: string;
}

export default function ChatOverlay({ roomId, userId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const glitchX = useSharedValue(0);

  // Use window dimensions for responsive layout
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobileWeb = Platform.OS === "web" && width < 768;
  const isMobile =
    isMobileWeb || Platform.OS === "ios" || Platform.OS === "android";

  // Draggable button state
  const initialX = width - BUTTON_SIZE - 15;
  const initialY =
    Platform.OS === "android"
      ? height - BUTTON_SIZE - 105 // 105 from original style
      : height - BUTTON_SIZE - 95; // 95 from original style

  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const context = useSharedValue({ x: 0, y: 0 });

  // Update position if screen dimensions change significantly (e.g. orientation)
  // Only if close to the edge to avoid snapping while dragging?
  // For simplicity, we typically trust the user's placement or reset on reload.
  // We'll leave it persistent for the session.

  const isOpenRef = useRef(isOpen);
  const textRef = useRef(text); // Store text in ref for Android

  // Keep text ref in sync
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // For mobile web, listen to visualViewport changes to detect the on-screen
  // keyboard height (browsers change the visual viewport when keyboard shows).
  useEffect(() => {
    if (Platform.OS !== "web" || !isMobileWeb) return;

    const vv: any = (window as any).visualViewport;

    const handleViewport = () => {
      const innerH = window.innerHeight || 0;
      const vvH = (vv && vv.height) || innerH;
      const offsetTop = (vv && vv.offsetTop) || 0;

      // keyboard height is the area removed from the layout by the keyboard
      const kb = Math.max(0, innerH - vvH - offsetTop);
      setKeyboardHeight(kb);
    };

    handleViewport();

    if (vv && vv.addEventListener) {
      vv.addEventListener("resize", handleViewport);
      vv.addEventListener("scroll", handleViewport);
    } else {
      window.addEventListener("resize", handleViewport);
    }

    return () => {
      if (vv && vv.removeEventListener) {
        vv.removeEventListener("resize", handleViewport);
        vv.removeEventListener("scroll", handleViewport);
      } else {
        window.removeEventListener("resize", handleViewport);
      }
    };
  }, [isMobileWeb]);

  useEffect(() => {
    const handleMessage = (data: any) => {
      setMessages((prev) => [
        ...prev,
        { ...data, id: Math.random().toString() },
      ]);

      if (!isOpenRef.current) {
        setUnreadCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    };

    // Load existing messages when joining
    const handleLoadMessages = (msgs: any[]) => {
      if (msgs && Array.isArray(msgs)) {
        const formatted = msgs.map((m) => ({
          ...m,
          id: Math.random().toString(),
        }));
        setMessages(formatted);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    };

    socketService.on("receive-message", handleMessage);
    socketService.on("load-messages", handleLoadMessages);

    return () => {
      socketService.off("receive-message");
      socketService.off("load-messages");
    };
  }, []);

  const sendMessage = (inputText?: string) => {
    // On Android, prefer React state value over native event text to avoid truncation issues
    // The native event text can sometimes be incomplete when sent quickly
    const messageText =
      Platform.OS === "android"
        ? text.trim()
        : (inputText || textRef.current || text).trim();
    if (!messageText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    glitchX.value = withSequence(
      withTiming(5, { duration: 30 }),
      withTiming(-3, { duration: 20 }),
      withTiming(0, { duration: 50 }),
    );

    const msgData = {
      roomId,
      message: messageText,
      userId,
      timestamp: Date.now(),
    };

    socketService.emit("send-message", msgData);
    setMessages((prev) => [
      ...prev,
      { ...msgData, id: Math.random().toString() },
    ]);

    // Clear text after sending - use small delay on Android to ensure UI updates properly
    if (Platform.OS === "android") {
      setTimeout(() => {
        setText("");
        textRef.current = "";
      }, 10);
    } else {
      setText("");
      textRef.current = "";
    }

    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
  };

  const handleSubmit = (e: any) => {
    // On Android, use state value; on iOS can use native event text
    const nativeText = Platform.OS === "android" ? text : e?.nativeEvent?.text;
    sendMessage(nativeText);
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setIsOpen(false);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glitchX.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleOpen)();
  });

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
      translateY.value = event.translationY + context.value.y;
    })
    .onEnd(() => {
      // Constraints
      const maxX = width - BUTTON_SIZE;
      const maxY = height - BUTTON_SIZE;
      let finalX = translateX.value;
      let finalY = translateY.value;

      // Clamp X
      if (finalX < 0) finalX = 0;
      else if (finalX > maxX) finalX = maxX;

      // Clamp Y
      if (finalY < insets.top) finalY = insets.top;
      else if (finalY > maxY - insets.bottom) finalY = maxY - insets.bottom;

      // Animate to clamped position
      translateX.value = withTiming(finalX, { duration: 200 });
      translateY.value = withTiming(finalY, { duration: 200 });
    });

  const composedGesture = Gesture.Simultaneous(dragGesture, tapGesture);

  // Calculate chat position based on keyboard.
  const chatBottom = isMobile
    ? keyboardHeight // On mobile (web/native), bottom is just keyboard height for full screen
    : keyboardHeight > 0
      ? keyboardHeight + 10
      : 90; // Desktop/Tablet floating style

  const chatHeight = isMobile
    ? undefined // Full screen handled by container style
    : Math.min(height * 0.45, 350);

  if (!isOpen) {
    return (
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.openButton, buttonAnimatedStyle]}>
          <MessageSquare color="black" size={24} strokeWidth={2.5} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    );
  }

  // Dynamic styles for mobile full screen
  const containerStyle = isMobile
    ? {
      top: 0,
      left: 0,
      right: 0,
      bottom: chatBottom, // anchor above keyboard
      zIndex: 9999,
      padding: 0,
      height: undefined, // ensure no fixed height overrides bottom
    }
    : {
      bottom: chatBottom,
      height: chatHeight,
    };

  const panelStyle = isMobile
    ? {
      borderRadius: 0,
      borderWidth: 0,
      flex: 1, // Take up all available space in container
    }
    : {};

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.container, containerStyle]}
    >
      <Animated.View style={[styles.panel, panelStyle, animatedStyle]}>
        {/* Header with close button */}
        <View
          style={[
            styles.header,
            isMobile && { paddingTop: Math.max(8, insets.top + 8) },
            isMobileWeb && styles.mobileWebHeader,
          ]}
        >
          <Text style={styles.headerTitle}>SQUAD CHAT</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X color="white" size={18} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isOwn = item.userId === userId;
            return (
              <View
                style={[
                  styles.bubbleContainer,
                  isOwn
                    ? styles.bubbleContainerRight
                    : styles.bubbleContainerLeft,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isOwn ? styles.myBubble : styles.theirBubble,
                  ]}
                >
                  <Text style={styles.sender}>{item.userId.split("-")[0]}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                </View>
              </View>
            );
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />

        {/* Input row */}
        <View
          style={[
            styles.inputRow,
            isMobile && styles.mobileWebInputRow, // keep the larger padding from mobileWebInputRow if desired, or override
            isMobile && {
              paddingBottom:
                keyboardHeight > 0 ? 8 : Math.max(8, insets.bottom + 8),
            },
            // Only add extra padding on web if needed, native handles it via container bottom
            isMobileWeb && keyboardHeight
              ? { paddingBottom: keyboardHeight + 8 }
              : null,
          ]}
        >
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(t) => {
              setText(t);
              textRef.current = t; // Sync ref immediately
            }}
            placeholder="Message..."
            placeholderTextColor="#888"
            onSubmitEditing={handleSubmit}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => sendMessage()}
          >
            <Send color="black" size={18} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 10,
    left: 10,
    zIndex: 3000,
  },
  panel: {
    flex: 1,
    backgroundColor: "#FFFEF5",
    borderWidth: 3,
    borderColor: "black",
    borderRadius: 4,
    shadowColor: Colors.spiderBlue,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 30,
    overflow: "hidden",
  },
  openButton: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: Colors.spiderRed,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "black",
    elevation: 20,
    zIndex: 3000,
    shadowColor: "black",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.spiderYellow,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "black",
  },
  badgeText: {
    color: "black",
    fontSize: 10,
    fontFamily: "Bangers_400Regular",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    backgroundColor: Colors.spiderBlue,
    borderBottomWidth: 2,
    borderBottomColor: "black",
  },
  headerTitle: {
    fontFamily: "Bangers_400Regular",
    fontSize: 16,
    color: "black",
  },
  closeBtn: {
    backgroundColor: "black",
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  list: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  listContent: {
    padding: 8,
  },
  bubbleContainer: {
    marginBottom: 8,
    maxWidth: "80%",
  },
  bubbleContainerLeft: {
    alignSelf: "flex-start",
  },
  bubbleContainerRight: {
    alignSelf: "flex-end",
  },
  bubble: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "black",
  },
  myBubble: {
    backgroundColor: Colors.spiderRed,
  },
  theirBubble: {
    backgroundColor: Colors.spiderYellow,
  },
  sender: {
    fontSize: 9,
    fontFamily: "Bangers_400Regular",
    color: "black",
    marginBottom: 2,
    opacity: 0.7,
  },
  message: {
    fontSize: 13,
    color: "black",
  },
  inputRow: {
    flexDirection: "row",
    padding: 6,
    borderTopWidth: 2,
    borderTopColor: "black",
    backgroundColor: "#222",
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: "black",
    backgroundColor: "white",
    paddingHorizontal: Platform.OS === "android" ? 12 : 10,
    paddingVertical: Platform.OS === "android" ? 6 : 0,
    height: 36,
    marginRight: 6,
    borderRadius: 4,
    fontSize: Platform.OS === "web" ? 16 : 14, // Min 16px for web to prevent zoom
    color: "black",
    textAlignVertical: "center",
  },
  sendBtn: {
    backgroundColor: Colors.spiderGreen,
    justifyContent: "center",
    alignItems: "center",
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: "black",
    borderRadius: 4,
  },
  mobileWebHeader: {
    paddingVertical: 12,
  },
  mobileWebInputRow: {
    paddingVertical: 12,
    paddingBottom: 20, // Extra padding for mobile browsers safe area
  },
});
