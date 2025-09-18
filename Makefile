commit:
	git add .
	git diff --staged | gemini -p "Generate a concise and informative commit message for the following changes:" | git commit -F -
	git push
