# Lunara

Smarter learning for modern students. Lunara is a student dashboard that puts your courses, documents, notes, assignments and AI study tools in one place.

**Live app:** https://lunara-neon.vercel.app

## Features

- **Courses and documents** – organise coursework and upload PDF or DOCX files; text is extracted for study use.
- **AI summaries and quizzes** – generate summaries and 10-question quizzes from your course material, plus an AI study assistant.
- **Spaced-repetition flashcards** – cards are scheduled with the SM-2 algorithm so you review what you are about to forget.
- **Notes** – keep notes alongside your courses.
- **Assignments and calendar** – track deadlines and see them on a calendar.
- **Question solver** – step-by-step solutions from typed questions, uploaded files or a live camera capture.
- **Past papers** – previous exam papers matched to your course codes, with year and exam-type filters.
- **Installable PWA** – works as an app on phones and desktops, with a mobile-friendly sidebar drawer.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript
- [Tailwind CSS](https://tailwindcss.com) 4
- [Supabase](https://supabase.com) for authentication and the Postgres database (Row Level Security enabled)
- [Groq](https://groq.com) (Llama models) for AI features
- `unpdf` and `mammoth` for PDF and DOCX text extraction
- Deployed on [Vercel](https://vercel.com)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GROQ_API_KEY=your-groq-api-key
# Optional: override the Groq models (comma separated, best first)
# GROQ_TEXT_MODELS=openai/gpt-oss-120b,qwen/qwen3.6-27b
# GROQ_VISION_MODELS=qwen/qwen3.8-27b,qwen/qwen3.6-27b
```

### 3. Set up the database

Create a Supabase project, then run the SQL in the Supabase SQL editor. `supabase/flashcards.sql` creates the flashcards table with Row Level Security policies. `supabase/solved_questions.sql` stores the Question solver history. `supabase/quiz_attempts.sql` stores quiz results, which feed the automatic course progress (flashcard mastery 55%, quiz scores 45%; see `lib/progress.ts`). `supabase/past_papers.sql` creates the past papers table, a private `past-papers` storage bucket and an `admins` table (see the comments in the file for adding yourself as admin). `supabase/course_images.sql` adds the private `course-images` bucket for pictures pulled out of uploaded PDFs. `supabase/profiles_fix.sql` adds the Row Level Security policies for `profiles` and for uploads to the public `avatars` bucket (each student's own folder only). The app also expects `courses`, `assignments`, `notes`, `profiles` and `study_sessions` tables, plus the `avatars` bucket, each restricted to the owning user with Row Level Security.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | What it does                      |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the development server      |
| `npm run build` | Create a production build         |
| `npm run start` | Run the production build          |
| `npm run lint`  | Lint the codebase with ESLint     |

## Project structure

```
app/            Routes, layout and API routes (/api/ai, /api/solve, /api/extract)
components/     UI grouped by area: auth, dashboard, ai, layout, ui
lib/            Supabase client and the SM-2 scheduling logic
public/         PWA manifest, service worker, icons
supabase/       SQL for database setup
```

## Deployment

The app is deployed on Vercel from this repository. Add the three environment variables above in the Vercel project settings.

## License

Released under the [MIT License](LICENSE).
