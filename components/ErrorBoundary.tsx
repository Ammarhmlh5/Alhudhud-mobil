import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Component, ErrorInfo, ReactNode } from 'react';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#F44336" />
          <ThemedText style={styles.title}>حدث خطأ غير متوقع</ThemedText>
          <ThemedText style={styles.message}>
            {this.state.error?.message || 'تعذر تحميل هذه الشاشة'}
          </ThemedText>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <ThemedText style={styles.btnText}>إعادة المحاولة</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  message: { fontSize: 14, opacity: 0.6, textAlign: 'center' },
  btn: {
    backgroundColor: '#E6A23C', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10, marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
