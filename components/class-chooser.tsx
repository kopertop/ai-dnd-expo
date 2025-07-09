import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CLASSES, ClassOption } from '../constants/classes';
import { chooserCardConstants, chooserCardStyles } from '../styles/chooser-cards.styles';
import { newGameStyles } from '../styles/new-game.styles';

const { IS_SMALL_SCREEN } = chooserCardConstants;

interface ClassChooserProps {
	onSelect: (classOption: ClassOption) => void;
	initialClassId?: string;
}

export const ClassChooser: React.FC<ClassChooserProps> = ({ onSelect, initialClassId }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

	const handleSelect = (classOption: ClassOption) => {
		if (classOption.isCustom) {
			setShowCustomForm(true);
		} else {
			onSelect(classOption);
		}
	};

	const handleCustomSubmit = () => {
		if (customName.trim() && customDesc.trim()) {
			onSelect({
				id: 'custom',
				name: customName,
				description: customDesc,
				image: require('../assets/images/custom.png'),
				isCustom: true,
			});
		}
	};

	const mainClasses = CLASSES.filter(c => !c.isCustom);
	const customClass = CLASSES.find(c => c.isCustom);

	return (
		<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
			<Text style={newGameStyles.title}>Choose Your Class</Text>
			{showCustomForm ? (
				<View style={newGameStyles.sectionBox}>
					<Text style={newGameStyles.label}>Class Name</Text>
					<TextInput
						style={newGameStyles.input}
						placeholder="Enter class name"
						value={customName}
						onChangeText={setCustomName}
					/>
					<Text style={newGameStyles.label}>Description</Text>
					<TextInput
						style={[newGameStyles.input, newGameStyles.textArea]}
						placeholder="Describe your class"
						value={customDesc}
						onChangeText={setCustomDesc}
						multiline
						numberOfLines={3}
					/>
					<TouchableOpacity style={chooserCardStyles.submitButton} onPress={handleCustomSubmit}>
						<Text style={chooserCardStyles.submitButtonText}>Create Class</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={chooserCardStyles.cardContainer}>
					{IS_SMALL_SCREEN ? (
						mainClasses.map((classOption) => (
							<View key={classOption.id} style={chooserCardStyles.singleCardRow}>
								<TouchableOpacity
									style={chooserCardStyles.card}
									onPress={() => handleSelect(classOption)}
								>
									<Image source={classOption.image} style={chooserCardStyles.image} resizeMode="cover" />
									<Text style={chooserCardStyles.cardTitle}>{classOption.name}</Text>
									<Text style={chooserCardStyles.cardDesc}>{classOption.description}</Text>
								</TouchableOpacity>
							</View>
						))
					) : (
						<View style={chooserCardStyles.cardRow}>
							{mainClasses.map((classOption) => (
								<TouchableOpacity
									key={classOption.id}
									style={chooserCardStyles.card}
									onPress={() => handleSelect(classOption)}
								>
									<Image source={classOption.image} style={chooserCardStyles.image} resizeMode="cover" />
									<Text style={chooserCardStyles.cardTitle}>{classOption.name}</Text>
									<Text style={chooserCardStyles.cardDesc}>{classOption.description}</Text>
								</TouchableOpacity>
							))}
						</View>
					)}
					{customClass && (
						<View style={chooserCardStyles.customCardRow}>
							<TouchableOpacity
								key={customClass.id}
								style={[chooserCardStyles.card, chooserCardStyles.customCard]}
								onPress={() => handleSelect(customClass)}
							>
								<Image source={customClass.image} style={chooserCardStyles.image} resizeMode="cover" />
								<Text style={chooserCardStyles.cardTitle}>{customClass.name}</Text>
								<Text style={chooserCardStyles.cardDesc}>{customClass.description}</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			)}
		</ScrollView>
	);
};
