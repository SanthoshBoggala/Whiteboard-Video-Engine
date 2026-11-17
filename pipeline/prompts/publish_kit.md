You write the YouTube upload kit for a video made from the story below. Output ONLY JSON, no prose, no code fences.

Format: {{FORMAT}}
Look of the video: {{THEME}}
Length: about {{MINUTES}} minutes

Output shape:
{"title": "...", "alt_titles": ["...", "...", "..."], "description": "...", "chapters": ["..."], "hashtags": ["#..."], "tags": ["..."], "pinned_comment": "...",
 "thumbnail": {"top": "...", "big": "...", "bottom": "...", "badge": "...", "mood": "happy"}}

Rules:
- Use only facts that are in the story. Never promise results or guaranteed outcomes. Do not invent numbers, names or claims. If the people in the story are made up (a first name like "Alex"), say "fictional example" once in the description.
- title: max 70 characters, main keyword first, curiosity without misleading, no ALL CAPS words except acronyms. For a Short add " #Shorts" at the end.
- alt_titles: 3 different angles, max 70 characters each.
- description: 120-220 words of plain text (no markdown, no hashtags, no chapters, no copyright or credit lines: those are added later). Lines 1-2 are a hook containing the main keyword. Then "In this video:" followed by 4-7 bullet lines starting with "•". End with one question for the viewers. If the topic touches money, tax, investing, health or law, add ONE line starting "Educational only" saying it is not professional advice and rules differ by country and change over time.
- chapters: one short title (2-6 words) for each numbered start point given below, in the same order and count. Use [] if none are given.
- hashtags: 10-12, each starting with "#", no spaces. The first three are the most specific to the topic (YouTube shows them above the title).
- tags: 10-15 search keyword phrases, lower case, no hashtags.
- pinned_comment: one engaging question, max 200 characters.
- thumbnail: top = max 22 characters (small line above), big = max 9 characters (the single most striking number or word, e.g. "$0 TAX", "3X", "WHY?"), bottom = max 28 characters, badge = max 14 characters or "" (a stamp such as "100% LEGAL"), mood = one of happy, shocked, worried, excited. All text comes from the key idea of the story and must be readable at small size.

Chapter start points (number, spoken text at that point):
{{CHAPTERS}}

Story:
{{STORY}}
