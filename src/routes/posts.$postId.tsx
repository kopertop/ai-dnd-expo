import { Link, createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';

import { NotFound } from '~/components/not-found';
import { PostErrorComponent } from '~/components/post-error-component';
import { postQueryOptions } from '~/utils/posts';

const PostComponent = () => {
	const { postId } = Route.useParams();
	const postQuery = useSuspenseQuery(postQueryOptions(postId));

	return (
		<div className="space-y-2">
			<h4 className="text-xl font-bold underline">{postQuery.data.title}</h4>
			<div className="text-sm">{postQuery.data.body}</div>
			<Link
				to="/posts/$postId/deep"
				params={{
					postId: postQuery.data.id,
				}}
				activeProps={{ className: 'text-black font-bold' }}
				className="inline-block py-1 text-blue-800 hover:text-blue-600"
			>
        Deep View
			</Link>
		</div>
	);
};

export const Route = createFileRoute('/posts/$postId')({
	loader: async ({ params: { postId }, context }) => {
		const data = await context.queryClient.ensureQueryData(
			postQueryOptions(postId),
		);

		return {
			title: data.title,
		};
	},
	head: ({ loaderData }) => ({
		meta: loaderData ? [{ title: loaderData.title }] : undefined,
	}),
	errorComponent: PostErrorComponent,
	notFoundComponent: () => {
		return <NotFound>Post not found</NotFound>;
	},
	component: PostComponent,
});
