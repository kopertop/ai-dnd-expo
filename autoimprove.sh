PROMPT="You are an autonomous developer assistant working on the repository at \`/Users/cmoyer/Projects/personal/ai-dnd-expo\`

Your mission is to finish the Apple on-device TTS feature by processing the TODO list in the file
\`{{REPO_ROOT}}/APPLE-TTS-TODO.md\`.
Only work on **one pending task at a time** – the next task is the first line (top-most) that
still shows \`[ ]\`.

For the selected task you must:

1️⃣ **Implement the required code** (create or edit the files that the task mentions).
   - Use the repository’s existing coding style (ESLint/Prettier, TypeScript strict).
   - When creating a new file, include any necessary imports and export the symbols exactly as described.
   - If the task references a type that does not exist, add it to the appropriate \`*.ts\` file.

2️⃣ **Add the minimal unit / integration tests** that prove the new code works.
   - Put test files under \`{{REPO_ROOT}}/tests/unit/…\` (or \`tests/integration/…\` if the task needs it).
   - Mock external native modules (\`@react-native-ai/apple\`, \`expo-av\`, etc.) with \`vi.doMock\`/\`jest.mock\` as the existing codebase does.
   - Ensure the tests cover both success and error paths described in the task.

3️⃣ **Run the full test suite** with the command:

cd {{REPO_ROOT}} && npm test

Capture the output.

4️⃣ **If the tests PASS**:
- Open \`APPLE-TTS-TODO.md\` and replace the \`[ ]\` for this task with \`[x]\`.
- Commit the changes (do **not** push) with a concise commit message that explains *why* the change was made, e.g.:
  \`\`\`
  feat(apple-tts): implement iOS-specific hook and real speech generation
  \`\`\`
- Return the text \`✅ TASK COMPLETED\` followed by the updated TODO list excerpt (the whole file is fine).

5️⃣ **If the tests FAIL or any step throws an error**:
- Revert any file changes you made for this task (so the repo stays clean).
- Return the text \`❌ TASK FAILED\` and include a detailed error report:
  - The command that was run,
  - The stdout / stderr from the test run,
  - The stack trace or Lint/TS errors,
  - A short suggestion on what might be missing (e.g., missing import, wrong mock shape).
- Do **not** modify the TODO file; the outer script will decide whether to retry.

**General rules**

- Never modify any task that is already marked \`[x]\`.
- Do not touch files unrelated to the current task.
- Keep the modifications minimal – only what the task description asks for.
- All file paths in your commands must be absolute or start from \`{{REPO_ROOT}}\`.
- After each successful iteration, the repository should stay in a state where \`npm test\` passes.

**When you have finished the last pending task** (the file contains only \`[x]\` entries), reply with:


🎉 ALL DONE – Apple TTS feature implemented and fully tested."


/opt/homebrew/bin/opencode --model ollama/gpt-oss:120b run "${PROMPT}"

#git add .
#git diff --staged | gemini -p "Generate a concise and informative commit message for the following changes:" | git commit -F -
#git push
