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
				}}
			/>
			<Stack.Screen
				name="images"
				options={{
					headerShown: true,
					title: 'Admin - Manage Images',
				}}
			/>
		</Stack>
	);
};

export default AdminLayout;

