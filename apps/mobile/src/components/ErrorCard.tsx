import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ErrorCardProps {
  error: string;
  onDismiss?: () => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ error, onDismiss }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Error</Text>
      <Text style={styles.message}>{error}</Text>
      {onDismiss && (
        <Text style={styles.dismissLink} onPress={onDismiss}>
          Dismiss
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    color: '#991b1b',
    marginBottom: 8,
  },
  dismissLink: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '600',
  },
});
