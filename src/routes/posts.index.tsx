import { createFileRoute } from '@tanstack/react-router';

const PostsIndexComponent = () => {
	return <div>Select a post.</div>;
};

export const Route = createFileRoute('/posts/')({
	component: PostsIndexComponent,
});
