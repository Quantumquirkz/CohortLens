import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '../src/lib/api';
import { clearToken } from '../src/lib/storage';

export default function DashboardPage() {
  const router = useRouter();
  const health = useQuery({ queryKey: ['health'], queryFn: () => apiClient.health() });
  const usage = useQuery({ queryKey: ['usage'], queryFn: () => apiClient.usage() });

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Dashboard</Text>
      <Text>Health: {health.data?.status || '...'}</Text>
      <Text>Neon: {health.data?.neon_db || '...'}</Text>
      <Text>
        Usage: {usage.data?.current_month_calls ?? 0}/{usage.data?.limit ?? '-'}
      </Text>

      <View style={styles.links}>
        <Link href="/predict">Go to Predict</Link>
        <Link href="/segment">Go to Segment</Link>
        <Link href="/recommendations">Go to Recommendations</Link>
      </View>

      <Button
        title="Logout"
        onPress={async () => {
          await clearToken();
          router.replace('/login');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 10,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  links: {
    marginVertical: 16,
    gap: 8,
  },
});
