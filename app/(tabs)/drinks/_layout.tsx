import { Stack } from 'expo-router';

export default function DrinksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-personal" />
      <Stack.Screen name="add-custom-drink" />
    </Stack>
  );
}
