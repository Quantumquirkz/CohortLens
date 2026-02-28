import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiClient } from '../src/lib/api';
import { Card } from '../src/components/Card';
import { ErrorCard } from '../src/components/ErrorCard';
import { LoadingOverlay } from '../src/components/LoadingOverlay';

interface SegmentRow {
  CustomerID?: string;
  Age: number;
  'Annual Income ($)': number;
  'Spending Score (1-100)': number;
}

export default function SegmentPage() {
  const [rows, setRows] = useState<SegmentRow[]>([
    { CustomerID: 'C1', Age: 25, 'Annual Income ($)': 50000, 'Spending Score (1-100)': 60 },
    { CustomerID: 'C2', Age: 35, 'Annual Income ($)': 75000, 'Spending Score (1-100)': 75 },
  ]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateRow = (index: number, field: keyof SegmentRow, value: string) => {
    const newRows = [...rows];
    if (field === 'CustomerID') {
      newRows[index][field] = value;
    } else {
      (newRows[index][field] as any) = Number(value);
    }
    setRows(newRows);
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        CustomerID: `C${rows.length + 1}`,
        Age: 30,
        'Annual Income ($)': 60000,
        'Spending Score (1-100)': 50,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    if (rows.length === 0) {
      setError('Add at least one customer');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.segment(rows);
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Segmentation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getClusterInfo = (cluster: number) => {
    const clusterInfo: Record<number, { name: string; color: string }> = {
      0: { name: 'Premium Active', color: '#7c3aed' },
      1: { name: 'Premium Passive', color: '#06b6d4' },
      2: { name: 'Budget Active', color: '#10b981' },
      3: { name: 'Young Active', color: '#f59e0b' },
      4: { name: 'Mature Passive', color: '#ef4444' },
      5: { name: 'Unclassified', color: '#6b7280' },
    };
    return clusterInfo[cluster] || { name: 'Unknown', color: '#999' };
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Segment Customers</Text>
      <Text style={styles.subtitle}>
        Classify customers into behavioral segments
      </Text>

      {error && (
        <ErrorCard error={error} onDismiss={() => setError(null)} />
      )}

      <Card>
        <Text style={styles.sectionTitle}>Customer Data</Text>
        {rows.map((row, idx) => (
          <View key={idx} style={styles.rowContainer}>
            <Text style={styles.rowLabel}>Customer {idx + 1}</Text>
            <TextInput
              style={styles.smallInput}
              value={row.CustomerID}
              onChangeText={(v) => updateRow(idx, 'CustomerID', v)}
              placeholder="ID"
              editable={!loading}
            />
            <TextInput
              style={styles.smallInput}
              value={String(row.Age)}
              onChangeText={(v) => updateRow(idx, 'Age', v)}
              placeholder="Age"
              keyboardType="number-pad"
              editable={!loading}
            />
            <TextInput
              style={styles.smallInput}
              value={String(row['Annual Income ($)'])}
              onChangeText={(v) => updateRow(idx, 'Annual Income ($)', v)}
              placeholder="Income"
              keyboardType="number-pad"
              editable={!loading}
            />
            <TextInput
              style={styles.smallInput}
              value={String(row['Spending Score (1-100)'])}
              onChangeText={(v) => updateRow(idx, 'Spending Score (1-100)', v)}
              placeholder="Score"
              keyboardType="number-pad"
              editable={!loading}
            />
            {rows.length > 1 && (
              <Button
                title="Remove"
                onPress={() => removeRow(idx)}
                color="#ef4444"
                disabled={loading}
              />
            )}
          </View>
        ))}

        <Button title="Add Row" onPress={addRow} disabled={loading} />
      </Card>

      <Button title={loading ? 'Segmenting...' : 'Segment'} onPress={onSubmit} disabled={loading} />

      {result && (
        <Card variant="success">
          <Text style={styles.resultTitle}>Segmentation Results</Text>
          {rows.map((row, idx) => (
            <View key={idx} style={styles.resultItem}>
              <Text style={styles.resultItemId}>{row.CustomerID || `C${idx + 1}`}</Text>
              {result.clusters[idx] !== undefined && (
                <View
                  style={[
                    styles.clusterBadge,
                    { backgroundColor: getClusterInfo(result.clusters[idx]).color },
                  ]}
                >
                  <Text style={styles.clusterBadgeText}>
                    {getClusterInfo(result.clusters[idx]).name}
                  </Text>
                </View>
              )}
            </View>
          ))}
          <Text style={styles.ruleVersion}>Rule version: {result.rule_version}</Text>
        </Card>
      )}

      <LoadingOverlay visible={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, color: '#0066cc' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 },
  rowContainer: { marginBottom: 16 },
  rowLabel: { fontSize: 12, fontWeight: '500', color: '#666', marginBottom: 8 },
  smallInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    fontSize: 12,
    backgroundColor: '#f8f9fa',
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#10b981', marginBottom: 12 },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  resultItemId: { fontSize: 12, fontWeight: '600', color: '#333' },
  clusterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  clusterBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  ruleVersion: { fontSize: 11, color: '#999', marginTop: 10, fontStyle: 'italic' },
});
