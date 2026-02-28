import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { apiClient } from '../src/lib/api';

export default function SegmentPage() {
  const [jsonRows, setJsonRows] = useState(
    '[{"CustomerID":"1","Age":30,"Annual Income ($)":65000,"Spending Score (1-100)":72}]',
  );
  const [result, setResult] = useState<string>('');

  const onSubmit = async () => {
    try {
      const parsed = JSON.parse(jsonRows) as Array<{
        CustomerID?: string;
        Age: number;
        'Annual Income ($)': number;
        'Spending Score (1-100)': number;
      }>;
      const res = await apiClient.segment(parsed);
      setResult(JSON.stringify(res.clusters));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Segment failed');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Segment</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        multiline
        numberOfLines={8}
        value={jsonRows}
        onChangeText={setJsonRows}
      />
      <Button title="Run Segmentation" onPress={onSubmit} />
      {result ? <Text style={styles.result}>Clusters: {result}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10 },
  textarea: { minHeight: 180, textAlignVertical: 'top' },
  result: { marginTop: 12, fontSize: 16, fontWeight: '600' },
});
