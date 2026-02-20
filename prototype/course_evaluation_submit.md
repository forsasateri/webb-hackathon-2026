# Prototype: Course Evaluation Submission Page

## Layout

```text
+-----------------------------------------------------------------------+
|  [Back to Selection]                                                  |
|                                                                       |
|  [Course Name: CS101 - Intro to Computer Science]                     |
|  [Examiner: Dr. Smith]                                                |
|                                                                       |
|  [General Rate: ( ) ( ) ( ) ( ) ( ) (1-5 Stars)]                      |
|                                                                       |
|  [Interesting Level: ( ) ( ) ( ) ( ) ( ) (1-5 Stars)]                 |
|                                                                       |
|  [Intense Level: ( ) ( ) ( ) ( ) ( ) (1-5 Stars)]                     |
|                                                                       |
|  [Tags: Select All that apply]                                        |
|  [x] Interesting Labs    [x] Humorous lectures                        |
|  [ ] Challenging Exam    [ ] Heavy Homework                           |
|  [ ] Valuable Content    [ ] Engaging Discussions                      |
|                                                                       |
|  [Feedback Area]                                                      |
|  +---------------------------------------------------------+          |
|  | Please provide your detailed feedback...                 |          |
|  | (Markdown/Plain text supported)                          |          |
|  +---------------------------------------------------------+          |
|                                                                       |
|  [Submit Review (Blue Button)]                                        |
+-----------------------------------------------------------------------+
```

## Features & Fields

### General Rate
- **Rating**: 1-5 stars. (Required field).

### Interesting Level
- **Rating**: 1-5 stars. (Required field).
- *Tooltip*: "How much did you enjoy the course material and activities?"

### Intense Level
- **Rating**: 1-5 stars. (Required field).
- *Tooltip*: "How much effort and time did you put into the course? (1: Light, 5: Intense)"

### Select Tags
- **Common Tags**: (e.g., `Interesting Labs`, `Humorous Lectures`).
- **Interactive Checkboxes**: Users can select multiple tags that describe their experience.

### Feedback Area
- **Text Input**: A large textarea for users to write their detailed comments.
- **Character Count**: (0/1000) display below the input.

### Interactions
- **Validation**: Ensures all required fields are filled before enabling the "Submit Review" button.
- **Success Message**: After submission, show a toast notification: "Thank you! Your evaluation has been recorded."
- **Redirect**: Automatically redirect back to the `Course Selection` page or `Course Evaluation Detail` page upon successful submission.
