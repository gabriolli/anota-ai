import { useLocalSearchParams } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { NoteEditor } from '../../components/NoteEditor';
import { Stack } from 'expo-router';

export default function EditNoteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const noteId = Number(id);

    if (!Number.isFinite(noteId) || noteId <= 0) {
        return (
            <View style={styles.centered}>
                <Text style={styles.msg}>ID inválido.</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Editar' }} />
            <NoteEditor noteId={noteId} />
        </>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7f8fa',
    },
    msg: {
        fontSize: 16,
        color: '#6b7280',
    },
});
