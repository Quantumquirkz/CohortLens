import { Stack } from 'expo-router';
import { QueryProvider } from '../src/providers/query-provider';

export default function RootLayout() {
  return (
    <QueryProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="predict" options={{ title: 'Predict' }} />
        <Stack.Screen name="segment" options={{ title: 'Segment' }} />
        <Stack.Screen name="recommendations" options={{ title: 'Recommendations' }} />
      </Stack>
    </QueryProvider>
  );
}
