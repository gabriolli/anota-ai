import { Stack } from 'expo-router';
import { SQLiteProvider } from '../contexts/SQLiteProvider';
import { colors } from '../theme/upTodoTheme';

export default function RootLayout() {
    return (
        <SQLiteProvider>
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.bg },
                    headerTintColor: colors.accent,
                    headerTitleStyle: {
                        color: colors.text,
                        fontWeight: '600',
                        fontSize: 17,
                    },
                    headerShadowVisible: false,
                    headerBackTitle: 'Voltar',
                    contentStyle: { backgroundColor: colors.bg },
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack>
        </SQLiteProvider>
    );
}
