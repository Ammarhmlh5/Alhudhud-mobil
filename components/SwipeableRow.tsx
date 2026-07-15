import { StyleSheet, Animated, TouchableOpacity, View, PanResponder } from 'react-native';
import { ReactNode, useRef, useEffect } from 'react';
import { ThemedText } from './ThemedText';

interface Props {
  children: ReactNode;
  onDelete: () => void;
}

export function SwipeableRow({ children, onDelete }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const onDeleteRef = useRef(onDelete);

  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.setValue(Math.max(g.dx, -80));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          Animated.spring(translateX, {
            toValue: -80, useNativeDriver: true, damping: 15, stiffness: 150,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0, useNativeDriver: true, damping: 15, stiffness: 150,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0, useNativeDriver: true, damping: 15, stiffness: 150,
        }).start();
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    onDeleteRef.current();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.deleteContainer}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <ThemedText style={styles.deleteText}>حذف</ThemedText>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden', marginHorizontal: 16, marginBottom: 12, borderRadius: 12 },
  deleteContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 80,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    flex: 1, backgroundColor: '#F44336', justifyContent: 'center',
    alignItems: 'center', width: '100%', borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
  },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
