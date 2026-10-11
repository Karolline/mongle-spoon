---
name: release-notes
description: Write a GitHub release note (Korean and English) for a version tag, comparing it with a previous tag, and optionally publish it as a GitHub release. Use when the user asks for release notes, 릴리즈 노트, or to publish/create a GitHub release.
argument-hint: <target tag> [previous tag]
---

# Release notes

Write the GitHub release note for a target tag (e.g. `v1.0.3`), covering every change since a previous tag (e.g. `v1.0.1`). Released versions may be skipped: the note for `v1.0.3` with previous tag `v1.0.1` covers v1.0.2 too.

## 1. Pick the tags

- Target tag: from the arguments. If missing, ask.
- Previous tag: from the arguments. If missing, use the tag of the latest published GitHub release (`gh release list --limit 1`), or ask if that isn't available. Never guess.
- Check both tags exist: `git tag --list`.

## 2. Gather the changes

- `CHANGELOG.md`: every version section after the previous tag up to and including the target tag. This is the main source.
- `git log --oneline <previous>..<target>`: to catch anything the changelog left out.
- When an entry is unclear, read the code at the target tag (`git show <target>:<path>`) so the note describes what actually shipped, not what the code does today.

Keep only changes a user of the app notices (screens, behavior, text). Leave out docs, CI, deployment, and refactoring commits, unless they change something users see. Say in your reply which commits you left out.

## 3. Write the note

One note with Korean first, then English, separated by `---`. The English half is a translation of the Korean half, not a different text.

Tone: friendly and plain, written for parents using the app, not developers. Korean in polite 해요체. Each item names the change in bold, says what happens now, and, when useful, gives a short example and what it was like before. Quote UI labels exactly as they appear in the app, in brackets (`[전체]`, `[다시 시도]`); in English, add the translation in parentheses the first time.

Template:

```markdown
<한 줄 요약: 어떤 업데이트인지>

### 바뀐 점
- **<변경 이름>**: <지금은 어떻게 되는지>. <예시>. 전에는 <이전 동작>.

저장된 레시피와 앱 사용 방법은 그대로예요.

---
<One-line summary>

### What's changed
- **<Change name>**: <What happens now>. <Example>. Before, <old behavior>.

Saved recipes and how you use the app are unchanged.

**Full changelog**: https://github.com/Karolline/mongle-spoon/compare/<previous>...<target>
```

Only keep the "unchanged" line when it's true (for example, drop it if a release changes saved data or how the app is used). If a release has bug fixes, a `### 고친 점` / `### Fixed` section may follow `### 바뀐 점` / `### What's changed`.

Example (v1.0.1, previous tag v1.0.0):

```markdown
레시피 목록 화면을 다듬은 업데이트예요.

### 바뀐 점
- **검색 결과 개수 표시**: 오른쪽 위 개수가 검색어와 끼니 필터에 맞는 레시피 개수로 바뀌어요. 예를 들어 [간식]을 누르면 간식 레시피 개수만 보여요. 전에는 필터를 써도 항상 전체 개수가 나왔어요.
- **불러오는 중 안내**: 앱을 처음 열 때 레시피가 아직 안 왔으면 "레시피를 불러오는 중이에요…"가 나와요. 전에는 이때 "0개"와 빈 화면이 나와서 레시피가 사라진 것처럼 보였어요.
- **서버 연결 재시도**: 서버가 한동안 쉬다가 깨어나는 중이면 약 30초 동안 알아서 다시 연결해요. 그래도 안 되면 [다시 시도] 버튼이 나와요.

저장된 레시피와 앱 사용 방법은 그대로예요.

---
A small update to the recipe list screen.

### What's changed
- **Filtered count**: The count in the top right now shows how many recipes match the current search and meal-time filter. For example, tapping [간식] shows only the number of snack recipes. Before, it always showed the total.
- **Loading message**: When the app first opens and recipes are still on their way, it shows a loading message. Before, it showed "0개" and an empty list, which made it look like the recipes were gone.
- **Automatic reconnect**: If the server is waking up after being idle, the app keeps trying to connect for about 30 seconds. If that still fails, a [다시 시도] (Try again) button appears.

Saved recipes and how you use the app are unchanged.

**Full changelog**: https://github.com/Karolline/mongle-spoon/compare/v1.0.0...v1.0.1
```

Save the note to the scratchpad directory (e.g. `release-notes-<target>.md`) and show it to the user in a code block.

## 4. Publish (only when the user asks)

Creating a release is public, so show the note first and get an explicit yes before publishing. Never create or push tags here: the target tag must already be on GitHub (`git ls-remote --tags origin <target>`); if it isn't, tell the user to push it.

With the GitHub CLI (`gh`, logged in via `gh auth login`):

```sh
gh release create <target> --title "<target>" --notes-file <note file> --verify-tag
```

`--verify-tag` makes it fail instead of creating a missing tag. If a release for the tag already exists, ask before replacing its notes (`gh release edit <target> --notes-file <note file>`). Report the release URL afterwards.

If `gh` isn't installed or logged in, don't work around it. Give the user the note to paste, and mention that in the GitHub release form they should pick the target tag and set "Previous tag" to the previous tag (that only affects GitHub's [Generate release notes] button; the compare link in the note already covers the range).
