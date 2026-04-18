import { NoteEditor } from '../../components/NoteEditor';
import { Stack } from 'expo-router';

export default function NewNoteScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Novo item' }} />
            <NoteEditor />
        </>
    );
}
