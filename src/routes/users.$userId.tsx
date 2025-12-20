import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { NotFound } from '~/components/not-found';
import { UserErrorComponent } from '~/components/user-error-component';
import { userQueryOptions } from '~/utils/users';

const UserComponent = () => {
	const params = Route.useParams();
	const userQuery = useSuspenseQuery(userQueryOptions(params.userId));
	const user = userQuery.data;

	return (
		<div className="space-y-2">
			<h4 className="text-xl font-bold underline">{user.name}</h4>
			<div className="text-sm">{user.email}</div>
		</div>
	);
};

export const Route = createFileRoute('/users/$userId')({
	loader: async ({ context, params: { userId } }) => {
		await context.queryClient.ensureQueryData(userQueryOptions(userId));
	},
	errorComponent: UserErrorComponent,
	component: UserComponent,
	notFoundComponent: () => {
		return <NotFound>User not found</NotFound>;
	},
});
