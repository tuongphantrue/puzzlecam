# Publish PuzzleCam on GitHub Pages — no local deployment

You do **not** need Node.js, npm, Docker, or a local web server to publish PuzzleCam.
GitHub Actions builds the app on GitHub's servers and GitHub Pages hosts the result over HTTPS.

## Browser-only deployment

1. Sign in to GitHub and create a new repository. `puzzlecam` is a good name.
   - If you use GitHub Free, make it **Public** for GitHub Pages.
   - Do not add a README, `.gitignore`, or license if GitHub offers those options; this project already includes them.

2. Unzip `puzzlecam-github-pages.zip` on your computer.

3. In the new GitHub repository, choose **Add file → Upload files**.

4. Upload the **contents inside the `puzzlecam` folder**, including:
   - `.github/`
   - `public/`
   - `src/`
   - `package.json`
   - `vite.config.ts`
   - the other root files

5. Commit the uploaded files to the `main` branch.

6. Open **Settings → Pages**.

7. Under **Build and deployment → Source**, choose **GitHub Actions**.

8. Open the **Actions** tab. The workflow named **Deploy PuzzleCam to GitHub Pages** will build and publish the website.

9. When deployment succeeds, GitHub shows the live URL. For a repository named `puzzlecam`, it is normally:

   `https://YOUR-GITHUB-USERNAME.github.io/puzzlecam/`

## Future updates

Any commit to the `main` branch automatically rebuilds and republishes the live website.

## Why the repository name does not need to be hard-coded

`vite.config.ts` reads GitHub's `GITHUB_REPOSITORY` environment variable during the Actions build and automatically chooses:

- `/puzzlecam/` for a project repository such as `YOURNAME/puzzlecam`
- `/` for a special user-site repository such as `YOURNAME/YOURNAME.github.io`

This keeps CSS, JavaScript, the PWA manifest, service worker, and icons working from the correct GitHub Pages URL.

## Camera access

GitHub Pages serves the site over HTTPS. Modern browsers require a secure context for camera access, so the hosted Pages URL is the intended way to use PuzzleCam on a phone.
