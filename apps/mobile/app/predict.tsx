import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { apiClient } from '../src/lib/api';

export default function PredictPage() {
  const [age, setAge] = useState('35');
  const [annualIncome, setAnnualIncome] = useState('75000');
  const [workExperience, setWorkExperience] = useState('10');
  const [familySize, setFamilySize] = useState('3');
  const [profession, setProfession] = useState('Engineer');
  const [result, setResult] = useState<string>('');

  const onSubmit = async () => {
    try {
      const res = await apiClient.predict({
        age: Number(age),
        annual_income: Number(annualIncome),
        work_experience: Number(workExperience),
        family_size: Number(familySize),
        profession,
      });
      setResult(`${res.predicted_spending} (${res.confidence})`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Predict failed');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Predict Spending</Text>
      <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="number-pad" />
      <TextInput style={styles.input} value={annualIncome} onChangeText={setAnnualIncome} placeholder="Annual income" keyboardType="number-pad" />
      <TextInput style={styles.input} value={workExperience} onChangeText={setWorkExperience} placeholder="Work experience" keyboardType="number-pad" />
      <TextInput style={styles.input} value={familySize} onChangeText={setFamilySize} placeholder="Family size" keyboardType="number-pad" />
      <TextInput style={styles.input} value={profession} onChangeText={setProfession} placeholder="Profession" />
      <Button title="Predict" onPress={onSubmit} />
      {result ? <Text style={styles.result}>Result: {result}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10 },
  result: { marginTop: 12, fontSize: 16, fontWeight: '600' },
});
