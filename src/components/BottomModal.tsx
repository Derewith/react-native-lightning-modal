import React, {
  PropsWithChildren,
  useCallback,
  useImperativeHandle,
} from 'react';
import { StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
const ReanimatedBackdrop = Animated.createAnimatedComponent(Pressable);

import { screen } from '../utils';

export type BottomModalProps = {
  /**
   * Height of modal's presented state. This is required for animation to behave correctly
   */
  height: number;

  /**
   * Color of the fullscreen view displayed behind modal.
   * You can also change this by using backdropStyle prop.
   * @example rgba(255,255,255,0.8)
   */
  backdropColor?: string;

  /**
   * Style of modal's container
   */
  style?: ViewStyle;

  /**
   * Type of animation
   * uses withTiming if set to 'timing'
   * uses withSpring if set to 'spring'
   * @default "timing"
   * @example <<BottomModal animation='timing' timingConfig={{duration: 300, easing: Easing.quad}} height={500} ref={bottomModalRef}>>
   */
  animation?: 'spring' | 'timing';

  /**
   * The configuration to use if animation prop is set to 'spring'
   */
  springConfig?: Animated.WithSpringConfig;

  /**
   * The configuration to use if animation prop is set to 'timing'
   * @default {duration: 300, easing: Easing.quad}
   */
  timingConfig?: Animated.WithTimingConfig;

  /**
   * Style of backdrop component
   */
  backdropStyle?: ViewStyle;
  /**
   * Action when pressing backdrop component
   */
  onPressBackdrop?: () => {};
};

export type BottomModalRef = {
  /**
   * Shows modal
   */
  show: () => void;

  /**
   * Hides modal
   */
  dismiss: () => void;

  /**
   * true if modal is visible
   */
  isActive: boolean;
};

const BottomModal = React.forwardRef<
  BottomModalRef,
  PropsWithChildren<BottomModalProps>
>(
  (
    {
      height,
      backdropColor,
      style,
      children,
      backdropStyle,
      onPressBackdrop,
      animation,
      springConfig,
      timingConfig,
    },
    ref
  ) => {
    const top = useSharedValue(screen.height);

    //Animates top value
    const updateTop = useCallback(
      (value: number) => {
        'worklet';
        if (animation === 'spring') {
          return withSpring(value, springConfig);
        } else {
          return withTiming(value, timingConfig);
        }
      },
      [timingConfig, animation, springConfig]
    );

    const isActive = useDerivedValue<boolean>(() => {
      if (top.value > screen.height - 10) {
        return false;
      } else {
        return true;
      }
    }, [top]);

    useImperativeHandle(ref, () => ({
      show: () => {
        top.value = updateTop(screen.height - height);
      },
      dismiss: () => {
        top.value = updateTop(screen.height);
      },
      isActive: isActive.value,
    }));

    const gestureHandler = useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      { startHeight: number }
    >({
      onStart: (_, context) => {
        context.startHeight = top.value;
      },
      onActive: (event, context) => {
        //Prevent modal to go up more than it should
        if (context.startHeight + event.translationY > screen.height - height) {
          top.value = context.startHeight + event.translationY;
        }
      },
      onEnd: () => {
        //Determine if modal should close or go back to its original height
        if (top.value > screen.height - height / 2) {
          top.value = updateTop(screen.height);
        } else {
          top.value = updateTop(screen.height - height);
        }
      },
    });

    const containerAnimatedStyle = useAnimatedStyle(() => ({
      top: top.value,
    }));

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
      //Less opaque if top value is larger, vice verca
      opacity: interpolate(
        top.value,
        [screen.height - height, screen.height],
        [1, 0]
      ),
      //don't show backdrop component if modal is not present, as it cancels any touch events
      top: isActive.value ? 0 : screen.height,
    }));

    return (
      <View style={styles.fullScreen}>
        <ReanimatedBackdrop
          onPress={onPressBackdrop}
          style={[
            styles.backdrop,
            { backgroundColor: backdropColor },
            backdropStyle,
            backdropAnimatedStyle,
          ]}
        />
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View
            style={[
              styles.container,
              { height },
              style,
              containerAnimatedStyle,
            ]}
          >
            {children}
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  }
);

BottomModal.defaultProps = {
  timingConfig: { duration: 300, easing: Easing.quad },
  animation: 'timing',
};

const styles = StyleSheet.create({
  fullScreen: {
    height: screen.height,
    position: 'absolute',
    top: 0,
    left: screen.width / 2,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    height: screen.height,
    width: screen.width,
  },
  container: {
    width: screen.width,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default BottomModal;
