# Griffon Juste

The testimony screen, extended with an investigation and an evidence tray.

Investigation lists the records. Court shows one statement at a time (typewriter, previous, next). Present the selected record. A statement with `canObject` and a matching `evidenceId` scores and flashes Objection. Presenting on a clean statement, or the wrong record, does not. Closing court records any contradiction that was never shown. Keyboard: left/right statements, up/down records, Enter presents, I investigation, P pause. The same controls are buttons.

Content: `template_id` `griffon-juste` and `testimony` / `evidence` as in the learning-system audit. If an item has no testimony, the game builds one statement from a wrong choice and one record from the right answer. `submitAnswer` uses the template name `Griffon Juste`.
