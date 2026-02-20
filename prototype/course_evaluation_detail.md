# Prototype: Course Evaluation Detail Page

## Layout

```text
+-----------------------------------------------------------------------+
|  [Back to Selection]                                                  |
|                                                                       |
|  [Course Name: CS101 - Intro to Computer Science]                     |
|  [Examiner: Dr. Smith]                                                |
|                                                                       |
|  [General Rate: 4.5/5 (**** )]                                       |
|                                                                       |
|  [Rate Distribution Graph]                                            |
|   5* | #################### (65%)                                     |
|   4* | ############ (40%)                                             |
|   3* | #### (15%)                                                     |
|   2* | # (5%)                                                         |
|   1* | # (5%)                                                         |
|                                                                       |
|  [Tags: Interesting Labs, Humorous Lectures, Heavy Homework]          |
|                                                                       |
|  [Hyperfeature: A Word Cloud (Visual Visualization)]                  |
|  +---------------------------------------------------------+          |
|  |     EASY   FUN   PRACTICAL   VALUABLE   INTERESTING     |          |
|  |   STIMULATING   CHALLENGING   INFORMATIVE   ENGAGING    |          |
|  +---------------------------------------------------------+          |
|                                                                       |
+-----------------------------------------------------------------------+
```

## Features & Visuals

### General Rate
- **Star Rating**: Visual 1-5 star representation (e.g., `4.5/5`).
- **Review Count**: Total number of student evaluations (e.g., `128 Reviews`).

### Rate Distribution Graph
- **Bar Chart**: Breakdown of ratings from 1-star to 5-star.
- **Percentage/Count Labels**: Displayed next to each bar.

### Tags
- **Common Tags**: Automatically extracted from textual reviews (e.g., `Interesting Labs`, `Humorous Lectures`).
- **Intensity level**: High/Medium/Low based on user ratings.

### Hyperfeatures
- **Word Cloud**: Dynamic visualization of the most frequent keywords in the reviews.
  - *Interaction*: Hovering over a word shows its frequency and highlights relevant reviews.
- **Sentiment Indicator**: Overall sentiment (Positive/Neutral/Negative) derived from evaluation data.
- **Credit Sources**: Links to specific, anonymized evaluation sources or profiles.
