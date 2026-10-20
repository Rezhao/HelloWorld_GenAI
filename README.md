This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Melon setup

The signed-in `/home` route lets users upload an image, ask Gemini for a caption, and upvote or downvote captions. Before using it:

1. Add `GEMINI_API_KEY` to `.env` alongside the existing `SUPABASE_URL` and `SUPABASE_ANON_KEY` values.
2. The original generation, vote, storage, and RLS setup should already be applied in Supabase from the previous setup.
3. Run `supabase/communities.sql` in the Supabase SQL editor. It adds communities, memberships, the `community_id` generation relationship, and the related RLS policies.
4. Run `supabase/profile-cards.sql` in the Supabase SQL editor to safely expose post author names and profile photos and allow Google profile synchronization.
5. Run `supabase/community-privacy.sql` in the Supabase SQL editor after the community and profile-card scripts. This adds descriptions, public/private visibility, owner membership, join requests, atomic owner approvals, and RLS protection for private posts, votes, and generated images. Existing communities remain public.
6. Run `supabase/post-comments.sql` after the privacy migration to enable comments on dedicated post pages.
7. Make sure the Supabase Auth providers and redirect URL from the previous assignment are still configured.
8. Run `supabase/appearance-images.sql` to enable community profile/background photos and personal profile backgrounds. Community owners open **Edit community photos** on their community page. Users set their own background in **Settings → Profile background**. Uploads accept PNG/JPEG/WebP up to 5 MB; removing a photo restores initials or the gradient. These decorative images are public in the separate `appearance-images` bucket, including for private community headers. Private posts and generated media remain private. Owner checks run in both the server action and database, with storage ownership enforced separately. Photo changes save immediately.

Private communities are discoverable by name and description. Only the owner and approved members can see their posts or post there. The owner reviews requests on the community page. Declined requests remain declined. Apply the migration before running this version of the app.

Run application regression checks with `node --test tests/*.test.mjs`. The SQL access-control regressions are `tests/community-privacy.sql` and `tests/post-comments.sql`; run it against a disposable PostgreSQL database with Supabase auth/storage schemas and the migrations applied. Both roll their fixtures back.

Posts open at `/home/post/[id]` from Melon, communities, and profile tabs. Signed-in users can comment on public posts; private threads require approved membership. Comments appear newest first in pages of 50. Authors can delete their own comments.

The Gemini request stays on the server, and the API key is never exposed to the browser. Generated images use signed URLs and are only readable by authenticated users.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
