import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
    return (
        <Stack screenOptions={{ headerShown: true, title: 'Admin Panel' }}>
            <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
            <Stack.Screen name="users" options={{ title: 'Manage Users' }} />
            <Stack.Screen name="books/index" options={{ title: 'Manage Books' }} />
            <Stack.Screen name="books/add" options={{ title: 'Upload Book' }} />
        </Stack>
    );
}
