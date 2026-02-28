import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Card: React.FC<CardProps> = ({ children, variant = 'default', style, ...props }) => {
  return (
    <View style={[styles.card, styles[`card_${variant}`], style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  card_default: {
    backgroundColor: '#ffffff',
    borderColor: '#e0e0e0',
  },
  card_success: {
    backgroundColor: '#f0f9ff',
    borderColor: '#10b981',
  },
  card_warning: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  card_error: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
});
