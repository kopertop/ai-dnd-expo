# Code Styles (Lint Rules)

Never put `&&` or `||` at the end of a code line.

## CORRECT

```
	if (
		gameState
		&& playerCharacter
		&& dmAgent.agent
		&& !hasInitialized
		&& dmAgent.messages.length === 1
		&& !dmAgent.isLoading
	)
```

## INCORRECT

```
	if (
		gameState &&
		playerCharacter &&
		dmAgent.agent &&
		!hasInitialized &&
		dmAgent.messages.length === 1 &&
		!dmAgent.isLoading
	)
```