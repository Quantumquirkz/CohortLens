import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { apiClient } from '../src/lib/api';

export default function RecommendationsPage() {
  const [query, setQuery] = useState('What are the best segments for upselling?');
  const [result, setResult] = useState('');

  const onSubmit = async () => {
    try {
      const res = await apiClient.recommendations({ query });
      setResult(`[${res.source}] ${res.recommendation}`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Recommendations failed');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Recommendations</Text>
      <TextInput style={[styles.input, styles.textarea]} value={query} onChangeText={setQuery} multiline />
      <Button title="Generate" onPress={onSubmit} />
      {result ? <Text style={styles.result}>{result}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10 },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  result: { marginTop: 12, fontSize: 16 },
});
