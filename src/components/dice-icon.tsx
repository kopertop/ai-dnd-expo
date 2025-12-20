import * as React from 'react';

type DiceIconProps = {
	size?: number;
	className?: string;
};

const DiceIcon: React.FC<DiceIconProps> = ({ size = 16, className = '' }) => {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			{/* Dice cube with 3D effect */}
			<rect
				x="2"
				y="2"
				width="12"
				height="12"
				rx="1.5"
				fill="currentColor"
				stroke="currentColor"
				strokeWidth="0.5"
			/>
			{/* Top face highlight */}
			<path
				d="M2 2 L8 4 L14 2 L8 0 Z"
				fill="rgba(255,255,255,0.2)"
			/>
			{/* Right face shadow */}
			<path
				d="M14 2 L14 14 L8 16 L8 4 Z"
				fill="rgba(0,0,0,0.1)"
			/>
			{/* Dice dots pattern (showing 5 on visible face) */}
			<circle cx="5" cy="5" r="0.8" fill="white" />
			<circle cx="11" cy="5" r="0.8" fill="white" />
			<circle cx="8" cy="8" r="0.8" fill="white" />
			<circle cx="5" cy="11" r="0.8" fill="white" />
			<circle cx="11" cy="11" r="0.8" fill="white" />
		</svg>
	);
};

export default DiceIcon;
