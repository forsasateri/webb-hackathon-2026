# Prototype: Course Selection Page

## Layout

```text
+-----------------------------------------------------------------------+
|  [Search Placeholder: Search courses, instructors...]  [Filter Button] |
|                                                                       |
|  [x] Hide Conflicting Courses  [Filters: Specialization | Time Slot]  |
+-----------------------------------------------------------------------+
| Course Name | Examiner | Specialization | Course Rate | Intensity | Time | Action |
|-------------|----------|----------------|-------------|-----------|------|--------|
| CS101 Intro | Dr. Smith| Computer Sci.  | [4.5/5](*)  | [Low](!)  | Mon 1| [Select]|
| MATH202 Calc| Dr. Jones| Mathematics    | [4.2/5](*)  | [High](!) | Tue 3| [Select]|
| ...         | ...      | ...            | ...         | ...       | ...  | ...    |
+-----------------------------------------------------------------------+

[Floating Features Panel]
+-----------------------------------------------------------+
| [Recommending Alg] [Spinning Wheels] [Chatbot] [NL Search] |
+-----------------------------------------------------------+
```

## Features & Interactions

### Selector View
- **Search Bar**: Real-time course/instructor search.
- **Filters**: Dropdowns for Specialization, Time Slot, etc.
- **Conflicting Checkbox**: `Hide conflicting courses` - When checked, hides courses that overlap with currently selected ones.

### Table View
- **Course Name (Hyperlink)**: Click to open `Course Info` modal/detail.
- **Course Rate (Hyperlink)**: Click to redirect to `Course Evaluation Detail` page.
- **Intensity level**: Visual tag derived from evaluation data.
- **Other Tags**: (e.g., `humorous lecture`, `interesting labs`) displayed as small badges.

### Interactions
- **Select/Deselect**: Clicking `[Select]` changes it to `[Deselect] (Green)`.
- **Conflict Warning**: Conflicting courses are highlighted in **red**. Hovering shows: `Course MATH202 and PHYS101 conflicting in time slots`.
- **Selection Limit**: After 5 courses, remaining `[Select]` buttons are disabled (grayed out).
- **Submit Verification**: Clicking "Submit Selection" opens a dialog summarizing choices and any warnings.

### Hyperfeatures
- **Recommending Algorithm**: Slider/Toggle to weight `Interests`, `Intense`, and `Informative`.
- **Random Selection (Spinning Wheels)**: Picks a random course from the filtered candidates.
- **Chatbot**: Side panel for natural language queries (e.g., "Find me a light course on Fridays").
- **Natural Language Search**: "Show me interesting courses" parses to filter `interest_level >= 0.8`.
