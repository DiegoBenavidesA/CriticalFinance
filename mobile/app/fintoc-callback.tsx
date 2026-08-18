import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/theme';

// Fallback por si el deep link de vuelta del widget de Fintoc SÍ se procesa
// dentro de la app (pasará en un build standalone; en Expo Go, volver por
// exp:// suele reiniciar el bundle antes de llegar acá). openAuthSessionAsync
// ya captura el resultado en cuenta.tsx — esta pantalla solo evita que se vea
// el "Unmatched Route" por defecto de Expo Router mientras se vuelve a Cuenta.
export default function FintocCallback() {
  useEffect(() => {
    router.replace('/(tabs)/cuenta');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
