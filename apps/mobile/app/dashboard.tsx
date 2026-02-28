import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '../src/lib/api';
import { clearToken } from '../src/lib/storage';
import { Card } from '../src/components/Card';
import { ErrorCard } from '../src/components/ErrorCard';
import { LoadingOverlay } from '../src/components/LoadingOverlay';

export default function DashboardPage() {
  const router = useRouter();
  const health = useQuery({ queryKey: ['health'], queryFn: () => apiClient.health() });
  const usage = useQuery({ queryKey: ['usage'], queryFn: () => apiClient.usage() });

  const isLoading = health.isLoading || usage.isLoading;
  const healthError = health.error as Error | null;
  const usageError = usage.error as Error | null;

  const onLogout = async () => {
    await clearToken();
    router.replace('/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Analytics Platform</Text>
      </View>

      {healthError && <ErrorCard error={`Health check failed: ${healthError.message}`} />}
      {usageError && <ErrorCard error={`Usage failed: ${usageError.message}`} />}

      <Card variant={health.data?.neon_db === 'connected' ? 'success' : 'warning'}>
        <Text style={styles.cardTitle}>System Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>API Version:</Text>
          <Text style={styles.statusValue}>{health.data?.version || '...'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Service:</Text>
          <Text style={styles.statusValue}>{health.data?.service || '...'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text
            style={[
              styles.statusValue,
              health.data?.status === 'ok' ? styles.statusOk : styles.statusError,
            ]}
          >
            {health.data?.status || '...'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Database:</Text>
          <Text
            style={[
              styles.statusValue,
              health.data?.neon_db === 'connected' ? styles.statusOk : styles.statusError,
            ]}
          >
            {health.data?.neon_db || '...'}
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>API Usage</Text>
        <View style={styles.usageRow}>
          <View style={styles.usageItem}>
            <Text style={styles.usageLabel}>Current Month</Text>
            <Text style={styles.usageValue}>
              {usage.data?.current_month_calls || 0}
            </Text>
          </View>
          <View style={styles.usageSeparator} />
          <View style={styles.usageItem}>
            <Text style={styles.usageLabel}>Limit</Text>
            <Text style={styles.usageValue}>
              {usage.data?.limit || '-'}
            </Text>
          </View>
        </View>
        {usage.data && (
          <View style={styles.usageBar}>
            <View
              style={[
                styles.usageBarFill,
                {
                  width: `${Math.min(
                    (usage.data.current_month_calls / usage.data.limit) * 100,
                    100
                  )}%`,
                },
              ]}
            />
          </View>
        )}
      </Card>

      <View style={styles.navigation}>
        <Text style={styles.navTitle}>Features</Text>
        <Link href="/predict" asChild>
          <View style={styles.navLink}>
            <Text style={styles.navLinkText}>📊 Predict Spending</Text>
          </View>
        </Link>
        <Link href="/segment" asChild>
          <View style={styles.navLink}>
            <Text style={styles.navLinkText}>🎯 Segment Customers</Text>
          </View>
        </Link>
        <Link href="/recommendations" asChild>
          <View style={styles.navLink}>
            <Text style={styles.navLinkText}>💡 Get Recommendations</Text>
          </View>
        </Link>
      </View>

      <Button title="Logout" onPress={onLogout} color="#dc2626" />

      <LoadingOverlay visible={isLoading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0066cc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  statusOk: {
    color: '#10b981',
  },
  statusError: {
    color: '#ef4444',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  usageItem: {
    alignItems: 'center',
    flex: 1,
  },
  usageSeparator: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  usageLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0066cc',
  },
  usageBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  navigation: {
    marginVertical: 24,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  navLink: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066cc',
  },
});
