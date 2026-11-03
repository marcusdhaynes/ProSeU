# Peractio

Falling terms on an 8×16 well. Each piece is labeled with an answer from the current item. Place a right term (space or Drop) to score and to award `blocksAwarded` line clears. Set a wrong term aside (X or Set aside) for a smaller score. A wrong term that locks stays in the well; a full row still clears. Fill-in items also accept typed answers.

Speed, the clock, and how many wrong labels appear follow the level position on the course tree.

Content: `template_id` `peractio`, `questionType` `tetris`, with `prompt`, `acceptedAnswers`, `distractors`, `blocksAwarded`, and `explanation`. Multiple choice, true/false, matching, and fill-in items in the same subsection and level are playable too. `submitAnswer` is called with template name `Peractio`.
