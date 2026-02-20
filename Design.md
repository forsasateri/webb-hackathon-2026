# Design
Key point: Course selection system
Key features: Course selectio page; course evaluation submit page; course evaluation detail page;

Two prototypes:
- By Gemini: https://gemini.google.com/share/53e764b40268
- By Kimi: https://yzp6gjuerdl3e.ok.kimi.link

following elaborating for each page

# First Screen: Course selection page

## Basic Layout
- Selector View
  - Search
  - Filters
    - xxx
  - Hide conflicting courses (conflicting in time slot with selected courses)
  
  
- Table View
  - Course
    - Name (hyperlink, click to see course info)
    - Examiner
    - Specialization
    - Course rate (hyperlink, click to see course rate detail)
    - Intensity level (from rate)
    - Time slot
    - ...
    - Other Tags: (e.g. interesting labs; humorous lecture styles; ...)

## Interactions

Normal case:

- After clicking the 「select」 button for a course, turn the button into 「deselect」, show the course into current selection;
  - After click 「deselect」, recover the button

- If there are two course conflicting in time slot, mark them in red; when move cursor to it, hinting 「Course xxx and xxx conflicting in time slots」

- If there are already 5 courses selected, ban all the others 「select」 buttons

- Before Submitting, Show a dialog with all warnings (if exists)

## Hyperfeatures
- Recommending Algorithm
  - Interests + Intense + Informative : Three factors formula (from course evaluation data)
    - my evaluation of previous courses + others' evaluation of same course => my profile
    - average evaluation of current candidate courses: course features => courses profile
  - Customized recommending strategy:
    - customize weight of different factors (「I care interesting most」 or 「I want to combine them equally」)

- Random Selection
  - Spinning Wheels (or something else, or provide as more ways as we can)
  - Select from current candidate courses, equal weight
  - Each time select one course

- Chatbot recommendation
  - User provide personal background and preferences, let AI help
  - AI proactively search information (with our MCP tools)
  - Fack check before response; credit sources; ...
  
- Natural language search
  - Input a natural sentence as search criteria, for example, 「interesting courses」-> interesting_level>=0.5
  
- Autosave
  - After each operation, state is persistent on server (including search criteriers, current selections)

# Course Evaluation View Page
- General Rate
- Rate Distribution Graph
- Tags

## Hyperfeatures
- A Word Cloud

# Course Evaluation Submission Page

just a naive submit page

- General Rate (from 1 star to 5 star)
- Interesting Level (from 1 star to 5 star)
- Intense Level (from 1 star to 5 star)
- Select some tags (interesting labs; humorous lecture styles)
- TextInput Area
