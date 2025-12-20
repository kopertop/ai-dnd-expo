import { ErrorComponent } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';

export const PostErrorComponent = ({ error }: ErrorComponentProps) => {
	return <ErrorComponent error={error} />;
};
