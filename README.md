# pdf.do - Coming Soon Page

A beautiful "Something is brewing" landing page for pdf.do by Thinksolv.

## Features

- ✅ Modern, clean design matching Thinksolv aesthetic
- ✅ HTML `noindex` meta tag to prevent Google indexing
- ✅ Responsive design (mobile-friendly)
- ✅ Animated background particles
- ✅ Smooth fade-in animations

## Free Deployment Options

### Option 1: Netlify Drop (Easiest - No Git Required)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop the `pdf.do` folder
3. Your site will be live instantly with a URL like `random-name-123.netlify.app`
4. You can add a custom domain later in settings

### Option 2: Vercel (If you have GitHub)
1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Vercel will auto-detect it's a static site
5. Deploy - done!

### Option 3: GitHub Pages (Free with GitHub)
1. Create a GitHub repository
2. Push this folder to the repository
3. Go to Settings → Pages
4. Select source branch (usually `main`)
5. Your site will be at `username.github.io/repo-name`

### Option 4: Cloudflare Pages (Free)
1. Push to GitHub/GitLab/Bitbucket
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Connect your repository
4. Build command: (leave empty for static HTML)
5. Publish directory: `/` (root)
6. Deploy!

### Option 5: Surge.sh (Command Line - Fastest)
```bash
# Install surge (if you don't have it)
npm install -g surge

# Navigate to this folder
cd pdf.do

# Deploy
surge

# Follow prompts:
# - Enter email
# - Enter password (or create account)
# - Enter domain: pdf-do.surge.sh (or any available name)
```

### Option 6: Render (Free Tier)
1. Go to [render.com](https://render.com)
2. Create a new Static Site
3. Connect your GitHub repository
4. Build command: (leave empty)
5. Publish directory: `/`
6. Deploy!

## Custom Domain Setup

After deploying, you can add your `pdf.do` domain:
- **Netlify**: Settings → Domain management → Add custom domain
- **Vercel**: Project Settings → Domains → Add domain
- **Cloudflare Pages**: Custom domains → Add domain

## Notes

- The page includes `<meta name="robots" content="noindex, nofollow">` to prevent search engine indexing
- Remove this meta tag when you're ready to launch
- All deployment options above have free tiers suitable for a simple landing page

