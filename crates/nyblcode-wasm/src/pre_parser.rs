use crate::models::SimulationError;

const RESERVED_KEYWORDS: &[&str] = &[
    // Core language
    "let", "fn", "return", "if", "else", "while", "for", "in", "repeat", "break", "continue",
    // Literals
    "true", "false", "none",
    // Future / game-specific
    "on", "event", "entity", "spawn", "state", "match", "loop", "class", "self", "import", "from",
    "as",
    // Error prevention
    "try", "catch", "throw", "async", "await", "yield", "const", "var", "pub", "use", "mod",
    "enum", "struct", "type", "ref",
    // Confusion prevention
    "null",
];

pub fn pre_check(code: &str) -> Option<SimulationError> {
    // Check for reserved words used as variable names: let <keyword> =
    for &keyword in RESERVED_KEYWORDS {
        let let_pattern = format!("let {} ", keyword);
        if code.contains(&let_pattern) {
            let line = code
                .lines()
                .enumerate()
                .find(|(_, line)| line.contains(&let_pattern))
                .map(|(i, _)| i as u32 + 1);

            return Some(SimulationError {
                line,
                column: None,
                message: format!("`{}` is a reserved word in Nybl", keyword),
                friendly_hint: Some(format!(
                    "You can't use `{}` as a variable name — try something like `my_{}` instead!",
                    keyword, keyword
                )),
            });
        }

        // Check for reserved words used as function names: fn <keyword>(
        let fn_pattern = format!("fn {}(", keyword);
        let fn_pattern_space = format!("fn {} (", keyword);
        if code.contains(&fn_pattern) || code.contains(&fn_pattern_space) {
            let line = code
                .lines()
                .enumerate()
                .find(|(_, line)| {
                    line.contains(&fn_pattern) || line.contains(&fn_pattern_space)
                })
                .map(|(i, _)| i as u32 + 1);

            return Some(SimulationError {
                line,
                column: None,
                message: format!("`{}` is a reserved word in Nybl", keyword),
                friendly_hint: Some(format!(
                    "You can't name a function `{}` — try something like `do_{}` instead!",
                    keyword, keyword
                )),
            });
        }
    }

    // Check for common function typos
    let typo_checks = [
        ("moev", "move"),
        ("mvoe", "move"),
        ("mov(", "move"),
        ("trun", "turn"),
        ("tunr", "turn"),
        ("trn(", "turn"),
        ("grap", "grab"),
        ("garb", "grab"),
        ("grb(", "grab"),
        ("drp(", "drop"),
        ("dorp", "drop"),
        ("sya(", "say"),
        ("sai(", "say"),
        ("waht", "wait"),
        ("wiat", "wait"),
        ("lok(", "look"),
        ("loook", "look"),
    ];

    for (typo, correct) in typo_checks {
        if code.contains(typo) {
            let line = code
                .lines()
                .enumerate()
                .find(|(_, line)| line.contains(typo))
                .map(|(i, _)| i as u32 + 1);

            return Some(SimulationError {
                line,
                column: None,
                message: format!("Hmm, I don't know `{}` — did you mean `{}`?", typo, correct),
                friendly_hint: Some(format!("Try `{}()` instead!", correct)),
            });
        }
    }

    // Check for common direction typos
    let direction_typos = [
        ("rihgt", "right"),
        ("rigth", "right"),
        ("righ", "right"),
        ("leftt", "left"),
        ("lef", "left"),
        ("dwon", "down"),
        ("donw", "down"),
        ("forwrad", "forward"),
        ("foward", "forward"),
    ];

    for (typo, correct) in direction_typos {
        if code.contains(&format!("\"{}\"", typo)) || code.contains(&format!("'{}'", typo)) {
            let line = code
                .lines()
                .enumerate()
                .find(|(_, line)| line.contains(typo))
                .map(|(i, _)| i as u32 + 1);

            return Some(SimulationError {
                line,
                column: None,
                message: format!("I don't know the direction \"{}\"", typo),
                friendly_hint: Some(format!("Did you mean \"{}\"?", correct)),
            });
        }
    }

    None
}
