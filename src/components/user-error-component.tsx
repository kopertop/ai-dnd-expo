import { ErrorComponent } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';

export const UserErrorComponent = ({ error }: ErrorComponentProps) => {
	return <ErrorComponent error={error} />;
};
