import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiClient } from '../src/lib/api';
import { Card } from '../src/components/Card';
import { ErrorCard } from '../src/components/ErrorCard';
import { LoadingOverlay } from '../src/components/LoadingOverlay';

export default function PredictPage() {
  const [age, setAge] = useState('35');
  const [annualIncome, setAnnualIncome] = useState('75000');
  const [workExperience, setWorkExperience] = useState('10');
  const [familySize, setFamilySize] = useState('3');
  const [profession, setProfession] = useState('Engineer');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!age || !annualIncome || !workExperience || !familySize) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.predict({
        age: Number(age),
        annual_income: Number(annualIncome),
        work_experience: Number(workExperience),
        family_size: Number(familySize),
        profession: profession || 'Other',
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Prediction failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#ef4444';
      default:
        return '#666';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Predict Spending Score</Text>
      <Text style={styles.subtitle}>
        Estimate customer spending score based on demographics
      </Text>

      {error && (
        <ErrorCard error={error} onDismiss={() => setError(null)} />
      )}

      <Card>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="e.g., 35"
          keyboardType="number-pad"
          editable={!loading}
        />

        <Text style={styles.label}>Annual Income ($)</Text>
        <TextInput
          style={styles.input}
          value={annualIncome}
          onChangeText={setAnnualIncome}
          placeholder="e.g., 75000"
          keyboardType="number-pad"
          editable={!loading}
        />

        <Text style={styles.label}>Work Experience (years)</Text>
        <TextInput
          style={styles.input}
          value={workExperience}
          onChangeText={setWorkExperience}
          placeholder="e.g., 10"
          keyboardType="number-pad"
          editable={!loading}
        />

        <Text style={styles.label}>Family Size</Text>
        <TextInput
          style={styles.input}
          value={familySize}
          onChangeText={setFamilySize}
          placeholder="e.g., 3"
          keyboardType="number-pad"
          editable={!loading}
        />

        <Text style={styles.label}>Profession</Text>
        <TextInput
          style={styles.input}
          value={profession}
          onChangeText={setProfession}
          placeholder="e.g., Engineer"
          editable={!loading}
        />

        <Button title={loading ? 'Predicting...' : 'Predict'} onPress={onSubmit} disabled={loading} />
      </Card>

      {result && (
        <Card variant="success">
          <Text style={styles.resultTitle}>Prediction Result</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Spending Score:</Text>
            <Text style={styles.resultValue}>
              {result.predicted_spending.toFixed(1)}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Confidence:</Text>
            <Text
              style={[
                styles.resultValue,
                { color: getConfidenceColor(result.confidence) },
              ]}
            >
              {result.confidence.toUpperCase()}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Rule Version:</Text>
            <Text style={styles.resultValue}>{result.rule_version}</Text>
          </View>
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
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  resultLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
});
