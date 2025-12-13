import { Stack } from 'expo-router';
import React from 'react';

const AdminLayout: React.FC = () => {
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					title: 'Admin Portal',
					headerTitleAlign: 'center',
				}}
			/>
			<Stack.Screen
				name="images"
				options={{
					headerShown: true,
					title: 'Admin - Manage Images',
					headerTitleAlign: 'center',
				}}
			/>
		</Stack>
	);
};

export default AdminLayout;
