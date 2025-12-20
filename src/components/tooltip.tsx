import * as React from 'react';

type TooltipProps = {
	content: string;
	children: React.ReactNode;
	position?: 'top' | 'bottom' | 'left' | 'right';
	className?: string;
};

export const Tooltip: React.FC<TooltipProps> = ({
	content,
	children,
	position = 'top',
	className = '',
}) => {
	const [isVisible, setIsVisible] = React.useState(false);
	const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	const handleMouseEnter = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		setIsVisible(true);
	};

	const handleMouseLeave = () => {
		timeoutRef.current = setTimeout(() => {
			setIsVisible(false);
		}, 100);
	};

	React.useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const positionClasses = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full right-0 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2',
	};

	const arrowClasses = {
		top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-l-transparent border-r-transparent border-b-transparent',
		bottom: 'bottom-full right-2 border-b-slate-800 border-l-transparent border-r-transparent border-t-transparent',
		left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-t-transparent border-b-transparent border-r-transparent',
		right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-t-transparent border-b-transparent border-l-transparent',
	};

	return (
		<div
			className={`relative inline-block ${className}`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{children}
			{isVisible && (
				<div
					className={`absolute z-50 whitespace-normal rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-xl ${positionClasses[position]}`}
					style={{ maxWidth: '280px', minWidth: '200px' }}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
				>
					{content}
					{position === 'bottom' && (
						<div
							className={`absolute h-0 w-0 border-4 ${arrowClasses[position]}`}
						/>
					)}
				</div>
			)}
		</div>
	);
};
