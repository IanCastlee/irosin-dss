import React, { useRef, useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  PanResponder,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ZoomableImageViewerProps {
  visible: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function calcDistance(t1: any, t2: any): number {
  const dx = t1.pageX - t2.pageX;
  const dy = t1.pageY - t2.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

export const ZoomableImageViewer: React.FC<ZoomableImageViewerProps> = ({
  visible,
  imageUrl,
  title,
  onClose,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const currentScale = useRef(1);
  const currentPan = useRef({ x: 0, y: 0 });

  const initialDistance = useRef(0);
  const baseScale = useRef(1);
  const lastTouchTime = useRef(0);

  const [zoomPercent, setZoomPercent] = useState(100);

  // Synchronize internal refs with Animated values
  useEffect(() => {
    const scaleListener = scale.addListener(({ value }) => {
      currentScale.current = value;
      setZoomPercent(Math.round(value * 100));
    });
    const panListener = pan.addListener(value => {
      currentPan.current = value;
    });

    return () => {
      scale.removeListener(scaleListener);
      pan.removeListener(panListener);
    };
  }, [scale, pan]);

  // Reset scale and pan when opening/closing
  useEffect(() => {
    if (visible) {
      resetTransform(false);
    }
  }, [visible, imageUrl]);

  const resetTransform = (animated = true) => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 4,
        }),
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          bounciness: 4,
        }),
      ]).start();
    } else {
      scale.setValue(1);
      pan.setValue({ x: 0, y: 0 });
      currentScale.current = 1;
      currentPan.current = { x: 0, y: 0 };
      setZoomPercent(100);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length >= 2,
      onMoveShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length >= 2 || currentScale.current > 1,

      onPanResponderGrant: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        // Double tap detector (tapped twice within 300ms)
        const now = Date.now();
        if (touches.length === 1 && now - lastTouchTime.current < 300) {
          lastTouchTime.current = 0;
          if (currentScale.current > 1.2) {
            resetTransform(true);
          } else {
            Animated.parallel([
              Animated.spring(scale, {
                toValue: 2.5,
                useNativeDriver: true,
                bounciness: 4,
              }),
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
                bounciness: 4,
              }),
            ]).start();
          }
          return;
        }
        lastTouchTime.current = now;

        if (touches.length >= 2) {
          initialDistance.current = calcDistance(touches[0], touches[1]);
          baseScale.current = currentScale.current;
        } else if (touches.length === 1) {
          pan.setOffset({
            x: currentPan.current.x,
            y: currentPan.current.y,
          });
          pan.setValue({ x: 0, y: 0 });
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2) {
          // Two-finger pinch gesture
          const dist = calcDistance(touches[0], touches[1]);
          if (initialDistance.current <= 0) {
            initialDistance.current = dist;
            baseScale.current = currentScale.current;
          } else {
            const factor = dist / initialDistance.current;
            let newScale = baseScale.current * factor;
            // Clamp scale between 0.85x and 5x
            newScale = Math.max(0.85, Math.min(5, newScale));
            scale.setValue(newScale);
          }
        } else if (touches.length === 1 && currentScale.current > 1) {
          initialDistance.current = 0;
          pan.setValue({
            x: gestureState.dx,
            y: gestureState.dy,
          });
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        initialDistance.current = 0;
        pan.flattenOffset();

        // If zoomed out smaller than 1x or exceeding 4x, spring back
        if (currentScale.current < 1) {
          resetTransform(true);
        } else if (currentScale.current > 4) {
          Animated.spring(scale, {
            toValue: 4,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }

        // Keep panning within image bounds
        const maxPanX = (SCREEN_WIDTH * (currentScale.current - 1)) / 2 + 60;
        const maxPanY = (SCREEN_HEIGHT * (currentScale.current - 1)) / 2 + 60;

        let targetX = currentPan.current.x;
        let targetY = currentPan.current.y;

        if (currentScale.current <= 1) {
          targetX = 0;
          targetY = 0;
        } else {
          targetX = Math.max(-maxPanX, Math.min(maxPanX, targetX));
          targetY = Math.max(-maxPanY, Math.min(maxPanY, targetY));
        }

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
      onPanResponderTerminate: () => {
        initialDistance.current = 0;
      },
    })
  ).current;

  if (!visible || !imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Top Floating Control Bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            {title ? (
              <Text style={styles.topBarTitle} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>

          {/* Reset Zoom Button */}
          {zoomPercent !== 100 && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => resetTransform(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={14} color="#ffffff" />
              <Text style={styles.resetBtnText}>{zoomPercent}%</Text>
            </TouchableOpacity>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Zoomable & Pannable Image Area */}
        <View style={styles.imageContainer} {...panResponder.panHandlers}>
          <Animated.Image
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              {
                transform: [
                  { scale: scale },
                  { translateX: pan.x },
                  { translateY: pan.y },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    gap: 12,
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  resetBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});