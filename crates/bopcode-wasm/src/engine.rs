use bop::BopLimits;

use crate::host::{bop_to_sim_error, BopCodeHost};
use crate::models::{PuzzleConfig, SimulationError, SimulationResult};
use crate::pre_parser;

/// Resource limits for simulation.
pub struct SimulationLimits {
    pub max_steps: u64,
    pub max_memory: usize,
}

impl SimulationLimits {
    pub fn standard() -> Self {
        Self {
            max_steps: 10_000,
            max_memory: 10 * 1024 * 1024, // 10 MB
        }
    }
}

pub fn run_simulation(code: &str, puzzle: &PuzzleConfig) -> SimulationResult {
    let limits = SimulationLimits::standard();

    let error_result = |error: SimulationError| SimulationResult {
        actions: vec![],
        final_state: puzzle.bot_start.clone(),
        final_grid: puzzle.grid.clone(),
        puzzle_completed: false,
        stars_met: puzzle.star_objectives.iter().map(|_| false).collect(),
        error: Some(error),
    };

    // Pre-parse for friendly errors
    if let Some(error) = pre_parser::pre_check(code) {
        return error_result(error);
    }

    // Parse (bop lib handles lex+parse)
    let stmts = match bop::parse(code) {
        Ok(stmts) => stmts,
        Err(e) => return error_result(bop_to_sim_error(e)),
    };

    // Run with BopCodeHost
    let mut host = BopCodeHost {
        bot: puzzle.bot_start.clone(),
        grid: puzzle.grid.clone(),
        actions: Vec::new(),
        completion: puzzle.completion.clone(),
        puzzle_completed: false,
        halted: false,
        halt_error: None,
    };

    let bop_limits = BopLimits {
        max_steps: limits.max_steps,
        max_memory: limits.max_memory,
    };

    let run_error = bop_vm::run(code, &mut host, &bop_limits).err();

    // Determine the final error:
    // - If the host halted with a game error, use that
    // - If puzzle_completed triggered on_tick halt, no error
    // - Otherwise, use the bop runtime error (if any)
    let error = if host.halt_error.is_some() {
        host.halt_error.clone()
    } else if host.puzzle_completed {
        None // on_tick returned Err to stop execution, but it's not a real error
    } else {
        run_error.map(bop_to_sim_error)
    };

    let puzzle_completed =
        error.is_none() && puzzle.completion.is_met(&host.bot, &host.grid, 0, 0);

    // Count instructions (AST-based) for star objectives
    let instructions = bop::count_instructions(&stmts);
    let steps = host.actions.len() as u32;
    let stars_met: Vec<bool> = if puzzle_completed {
        puzzle
            .star_objectives
            .iter()
            .map(|obj| obj.is_met(&host.bot, &host.grid, instructions, steps))
            .collect()
    } else {
        puzzle.star_objectives.iter().map(|_| false).collect()
    };

    SimulationResult {
        actions: host.actions,
        final_state: host.bot,
        final_grid: host.grid,
        puzzle_completed,
        stars_met,
        error,
    }
}
