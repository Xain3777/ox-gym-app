# Coach photos

Drop coach images into this folder. The `/portal/coaches` page references
them by the `image` field in `src/data/coaches.ts`.

If a file is missing or fails to load, the UI shows a clean Arabic
placeholder ("صورة المدرب") — no broken image icons.

Recommended:
- Format: `.jpg` (or `.jpeg` / `.png` — match the path in `coaches.ts`)
- Aspect: square or slightly portrait (e.g. 800×900)
- File size: ≤ 300 KB each (compress before committing)

Expected filenames (matching `src/data/coaches.ts`):

| Coach          | File                  |
| -------------- | --------------------- |
| عبد            | abd.jpg               |
| علي            | ali.jpg               |
| عابد صالح      | abed-saleh.jpg        |
| نجدت           | najdat.jpg            |
| هديل مصطفى     | hadeel-mustafa.jpg    |
| ذوالفقار       | thulfiqar.jpg         |
| مرام مخلوف     | maram-makhlouf.jpg    |
| سومر خدام      | somer-khaddam.jpg     |
| عمر فوز        | omar-fawz.jpg         |

To use a different filename or extension, update the `image` path on the
matching coach in `src/data/coaches.ts`.
