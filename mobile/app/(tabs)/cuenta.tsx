import { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { colors } from '@/theme';
import { fmtCLP } from '@/utils/format';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

type Account = {
  id: string;
  bank: string | null;
  accountType: string | null;
  accountNumber: string | null;
  currency: string;
  balanceCents: number;
  provider: string | null;
};

export default function CuentaScreen() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: me, refetch } = useQuery<{ accounts: Account[] }>({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/me')).data,
  });

  // La cuenta ya queda guardada en la base de datos apenas el widget termina
  // (server-to-server, ver fintoc-widget.controller.ts), así que basta con
  // refrescar /me al volver a esta pantalla para verla — no depende de que
  // sobreviva el viaje de vuelta a la app.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const connectedAccounts = (me?.accounts ?? []).filter((a) => a.provider === 'fintoc');

  const connectBank = async () => {
    setMessage(null);
    setConnecting(true);
    try {
      const { data: linkIntent } = await api.post('/fintoc/link-intents', {});
      const redirectUri = Linking.createURL('fintoc-callback');
      const widgetUrl =
        `${api.defaults.baseURL}/fintoc/widget` +
        `?widgetToken=${encodeURIComponent(linkIntent.widget_token)}` +
        `&redirectUri=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(widgetUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const { queryParams } = Linking.parse(result.url);
        if (queryParams?.status === 'success') {
          setMessage('Cuenta conectada con éxito.');
        } else if (queryParams?.status === 'error') {
          setMessage('No se pudo conectar la cuenta.');
        } else {
          setMessage('Conexión cancelada.');
        }
      } else {
        // En Expo Go, volver por el deep link a veces reinicia la app antes
        // de que este código llegue a correr — si eso pasa, no hay mensaje
        // que mostrar, pero la cuenta ya quedó guardada del lado del server.
        setMessage('Si la conexión fue exitosa, tu cuenta ya debería aparecer abajo.');
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e: any) {
      setMessage(e?.response?.data?.message ?? 'No se pudo conectar la cuenta.');
    } finally {
      setConnecting(false);
    }
  };

  const syncMovements = async (accountId: string) => {
    setSyncingId(accountId);
    setMessage(null);
    try {
      const { data } = await api.post(`/fintoc/accounts/${accountId}/sync-movements`);
      setMessage(`Se sincronizaron ${data.processed} movimientos.`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (e: any) {
      setMessage(e?.response?.data?.message ?? 'No se pudieron sincronizar los movimientos.');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      <Text style={s.title}>Cuenta</Text>
      <Text style={s.text}>Conecta tu cuenta bancaria a través de Fintoc (sandbox).</Text>

      <Pressable style={[s.btn, connecting && s.btnDisabled]} onPress={connectBank} disabled={connecting}>
        {connecting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnText}>Conectar cuenta bancaria</Text>
        )}
      </Pressable>

      {message ? <Text style={s.message}>{message}</Text> : null}

      {connectedAccounts.length > 0 && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={s.sectionTitle}>Cuentas conectadas</Text>
          {connectedAccounts.map((acc) => (
            <View key={acc.id} style={s.accountCard}>
              <Text style={s.accountBank}>{acc.bank}</Text>
              <Text style={s.accountMeta}>
                {acc.accountType} · {acc.accountNumber}
              </Text>
              <Text style={s.accountBalance}>{fmtCLP(acc.balanceCents)}</Text>
              <Pressable
                style={s.syncBtn}
                onPress={() => syncMovements(acc.id)}
                disabled={syncingId === acc.id}
              >
                <Text style={s.syncBtnText}>
                  {syncingId === acc.id ? 'Sincronizando…' : 'Sincronizar movimientos'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable style={s.logoutBtn} onPress={signOut}>
        <Text style={s.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  text: { color: colors.textMuted },

  btn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700' },

  message: { color: colors.textMuted, marginTop: 4 },

  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 4,
  },
  accountBank: { color: colors.text, fontWeight: '700', fontSize: 15 },
  accountMeta: { color: colors.textMuted, fontSize: 12 },
  accountBalance: { color: colors.text, fontWeight: '700', fontSize: 18, marginTop: 4 },
  syncBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.chipBg,
  },
  syncBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  logoutBtn: { marginTop: 20, alignItems: 'center', padding: 12 },
  logoutText: { color: colors.danger, fontWeight: '600' },
});
