import EditProfileScreen from "../../src/screens/Profile/EditProfileScreen";
// Force layout refresh
import { Stack } from 'expo-router';

export default function Page() {
    return (
        <>
            <Stack.Screen options={{ headerTitle: "Edit Profile", headerBackTitle: "", headerTintColor: '#2D3250', headerShown: true }} />
            <EditProfileScreen />
        </>
    );
}
