use nybl::{NyblError, NyblHost, Value};

use crate::models::{
    BotState, Direction, GameAction, GameActionKind, Grid, Position, PuzzleObjective,
    SimulationError, TileItem, TileType,
};

pub struct NyblCodeHost {
    pub bot: BotState,
    pub grid: Grid,
    pub actions: Vec<GameAction>,
    pub completion: PuzzleObjective,
    pub puzzle_completed: bool,
    pub halted: bool,
    pub halt_error: Option<SimulationError>,
}

impl NyblCodeHost {
    fn emit(&mut self, line: u32, action: GameActionKind) {
        self.actions.push(GameAction {
            line: Some(line),
            action,
        });
    }

    fn halt_with_error(&mut self, line: u32, message: impl Into<String>, hint: impl Into<String>) {
        let message = message.into();
        self.emit(line, GameActionKind::Error {
            message: message.clone(),
        });
        self.halt_error = Some(SimulationError {
            line: Some(line),
            column: None,
            message,
            friendly_hint: Some(hint.into()),
        });
        self.halted = true;
    }

    fn check_objectives(&mut self) {
        self.puzzle_completed = self.completion.is_met(&self.bot, &self.grid, 0, 0);
    }

    fn error(&self, line: u32, message: impl Into<String>) -> NyblError {
        NyblError::runtime(message, line)
    }

    fn error_with_hint(
        &self,
        line: u32,
        message: impl Into<String>,
        hint: impl Into<String>,
    ) -> NyblError {
        let mut error = NyblError::runtime(message, line);
        error.friendly_hint = Some(hint.into());
        error
    }

    fn expect_args(
        &self,
        name: &str,
        args: &[Value],
        expected: usize,
        line: u32,
    ) -> Result<(), NyblError> {
        if args.len() != expected {
            Err(self.error(
                line,
                format!(
                    "`{}` expects {} argument{}, but got {}",
                    name,
                    expected,
                    if expected == 1 { "" } else { "s" },
                    args.len()
                ),
            ))
        } else {
            Ok(())
        }
    }

    fn parse_direction(&self, val: &Value, line: u32) -> Result<Direction, NyblError> {
        match val {
            Value::Str(s) => match s.to_lowercase().as_str() {
                "up" => Ok(Direction::Up),
                "down" => Ok(Direction::Down),
                "left" => Ok(Direction::Left),
                "right" => Ok(Direction::Right),
                "forward" | "ahead" => Ok(self.bot.direction),
                "backward" | "back" => Ok(self.bot.direction.opposite()),
                _ => Err(self.error_with_hint(
                    line,
                    format!("Invalid direction: \"{}\"", s),
                    "Use \"up\", \"down\", \"left\", \"right\", \"forward\", or \"backward\".",
                )),
            },
            _ => Err(self.error(
                line,
                format!("Direction must be a string, but got {}", val.type_name()),
            )),
        }
    }

    fn look_ahead_tile(&self) -> Option<&crate::models::Tile> {
        let (dx, dy) = self.bot.direction.to_offset();
        let pos = Position::new(self.bot.position.x + dx, self.bot.position.y + dy);
        self.grid.get_tile(pos)
    }

    // ─── Game builtins ────────────────────────────────────────────

    fn builtin_move(&mut self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("move", args, 1, line)?;
        let direction = self.parse_direction(&args[0], line)?;
        let from = self.bot.position;
        let (dx, dy) = direction.to_offset();
        let to = Position::new(from.x + dx, from.y + dy);

        let tile = self.grid.get_tile(to);
        match tile {
            None => {
                self.bot.direction = direction;
                self.emit(line, GameActionKind::Bump {
                    position: from,
                    direction,
                    message: "Bonk! The path is blocked.".into(),
                });
                return Ok(Value::None);
            }
            Some(t) => match t.tile_type {
                TileType::Wall => {
                    self.bot.direction = direction;
                    self.emit(line, GameActionKind::Bump {
                        position: from,
                        direction,
                        message: "Bonk! The path is blocked.".into(),
                    });
                    return Ok(Value::None);
                }
                TileType::LockedDoor => {
                    if self.bot.keys > 0 {
                        self.bot.keys -= 1;
                        if let Some(tile) = self.grid.get_tile_mut(to) {
                            tile.tile_type = TileType::Floor;
                        }
                        self.emit(line, GameActionKind::Unlock { position: to });
                    } else {
                        self.halt_with_error(
                            line,
                            "The door is locked!",
                            "You need a key to unlock this door. Use grab() to pick up keys.",
                        );
                        return Ok(Value::None);
                    }
                }
                _ => {
                    // Floor, Goal, Pit, GemVault, DiamondVault — all walkable
                }
            },
        }

        // Execute the move
        self.bot.position = to;
        self.bot.direction = direction;
        self.emit(line, GameActionKind::Move {
            from,
            to,
            direction,
        });

        // Post-move effects
        let tile_type = self.grid.get_tile(to).map(|t| t.tile_type);

        if tile_type == Some(TileType::Pit) {
            self.emit(line, GameActionKind::FallIntoPit { position: to });
            self.halt_with_error(
                line,
                "Fell into a pit!",
                "Use pit_ahead() to check for pits before moving.",
            );
            return Ok(Value::None);
        }

        self.check_objectives();
        Ok(Value::None)
    }

    fn builtin_turn(&mut self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("turn", args, 1, line)?;
        let dir_str = match &args[0] {
            Value::Str(s) => s.to_lowercase(),
            _ => return Err(self.error(line, "turn needs a string direction")),
        };
        let from = self.bot.direction;
        let to = match dir_str.as_str() {
            "left" => self.bot.direction.turn_left(),
            "right" => self.bot.direction.turn_right(),
            _ => {
                return Err(self.error_with_hint(
                    line,
                    format!("Invalid turn direction: \"{}\"", dir_str),
                    "Use \"left\" or \"right\".",
                ));
            }
        };
        self.bot.direction = to;
        self.emit(line, GameActionKind::Turn { from, to });
        Ok(Value::None)
    }

    fn builtin_grab(&mut self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("grab", args, 0, line)?;
        let pos = self.bot.position;
        if let Some(tile) = self.grid.get_tile_mut(pos) {
            match tile.item {
                Some(TileItem::Gem) => {
                    tile.item = None;
                    self.bot.gems += 1;
                    self.emit(line, GameActionKind::Grab { position: pos });
                    self.check_objectives();
                }
                Some(TileItem::Key) => {
                    tile.item = None;
                    self.bot.keys += 1;
                    self.emit(line, GameActionKind::Grab { position: pos });
                }
                Some(TileItem::Diamond) => {
                    tile.item = None;
                    self.bot.diamonds += 1;
                    self.emit(line, GameActionKind::Grab { position: pos });
                }
                None => {
                    self.halt_with_error(
                        line,
                        "Nothing here to grab!",
                        "Use look() or gem_here() to check for items before grabbing.",
                    );
                }
            }
        }
        Ok(Value::None)
    }

    fn builtin_drop(&mut self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("drop", args, 0, line)?;
        let pos = self.bot.position;
        let tile_type = self.grid.get_tile(pos).map(|t| t.tile_type);

        match tile_type {
            Some(TileType::GemVault) => {
                if self.bot.gems > 0 {
                    self.bot.gems -= 1;
                    self.bot.gems_deposited += 1;
                    self.emit(line, GameActionKind::Deposit {
                        position: pos,
                        item: TileItem::Gem,
                    });
                    self.check_objectives();
                } else {
                    self.halt_with_error(
                        line,
                        "You don't have any gems to deposit!",
                        "Grab gems first with grab(), then bring them to the vault.",
                    );
                }
            }
            Some(TileType::DiamondVault) => {
                if self.bot.diamonds > 0 {
                    self.bot.diamonds -= 1;
                    self.bot.diamonds_deposited += 1;
                    self.emit(line, GameActionKind::Deposit {
                        position: pos,
                        item: TileItem::Diamond,
                    });
                    self.check_objectives();
                } else {
                    self.halt_with_error(
                        line,
                        "You don't have any diamonds to deposit!",
                        "Grab diamonds first with grab(), then bring them to the vault.",
                    );
                }
            }
            _ => {
                if self.bot.gems > 0 {
                    if let Some(tile) = self.grid.get_tile_mut(pos) {
                        if tile.item.is_some() {
                            self.halt_with_error(
                                line,
                                "There's already an item here!",
                                "Move to an empty tile before dropping.",
                            );
                            return Ok(Value::None);
                        }
                        tile.item = Some(TileItem::Gem);
                        self.bot.gems -= 1;
                        self.emit(line, GameActionKind::Drop { position: pos });
                        self.check_objectives();
                    }
                } else {
                    self.halt_with_error(
                        line,
                        "You're not holding anything to drop!",
                        "You need to grab() an item before you can drop it.",
                    );
                }
            }
        }
        Ok(Value::None)
    }

    fn builtin_say(&mut self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("say", args, 1, line)?;
        let message = format!("{}", args[0]);
        self.bot.message = Some(message.clone());
        self.emit(line, GameActionKind::Say { message });
        Ok(Value::None)
    }

    fn builtin_wait(&mut self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("wait", args, 1, line)?;
        match &args[0] {
            Value::Number(n) => {
                let ticks = (*n as i64).clamp(1, 100) as u32;
                self.emit(line, GameActionKind::Wait { ticks });
            }
            _ => return Err(self.error(line, "wait needs a number")),
        }
        Ok(Value::None)
    }

    fn builtin_look(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("look", args, 1, line)?;
        let dir_str = match &args[0] {
            Value::Str(s) => s.to_lowercase(),
            _ => return Err(self.error(line, "look needs a string direction")),
        };
        let direction = match dir_str.as_str() {
            "up" => Direction::Up,
            "down" => Direction::Down,
            "left" => Direction::Left,
            "right" => Direction::Right,
            "ahead" | "forward" => self.bot.direction,
            "backward" | "back" => self.bot.direction.opposite(),
            _ => return Ok(Value::new_str("invalid".to_string())),
        };
        let (dx, dy) = direction.to_offset();
        let look_pos = Position::new(self.bot.position.x + dx, self.bot.position.y + dy);
        let result = match self.grid.get_tile(look_pos) {
            None => "wall",
            Some(tile) => match tile.item {
                Some(TileItem::Gem) => "gem",
                Some(TileItem::Key) => "key",
                Some(TileItem::Diamond) => "diamond",
                None => match tile.tile_type {
                    TileType::Floor => "floor",
                    TileType::Wall => "wall",
                    TileType::Goal => "goal",
                    TileType::Pit => "pit",
                    TileType::LockedDoor => "locked_door",
                    TileType::GemVault => "gem_vault",
                    TileType::DiamondVault => "diamond_vault",
                },
            },
        };
        Ok(Value::new_str(result.to_string()))
    }

    fn builtin_position(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("position", args, 0, line)?;
        Ok(Value::new_array(vec![
            Value::Number(self.bot.position.x as f64),
            Value::Number(self.bot.position.y as f64),
        ]))
    }

    fn builtin_facing(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("facing", args, 0, line)?;
        let dir = match self.bot.direction {
            Direction::Up => "up",
            Direction::Down => "down",
            Direction::Left => "left",
            Direction::Right => "right",
        };
        Ok(Value::new_str(dir.to_string()))
    }

    fn builtin_gem_ahead(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("gem_ahead", args, 0, line)?;
        Ok(Value::Bool(
            self.look_ahead_tile()
                .is_some_and(|t| t.item == Some(TileItem::Gem)),
        ))
    }

    fn builtin_wall_ahead(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("wall_ahead", args, 0, line)?;
        Ok(Value::Bool(
            self.look_ahead_tile()
                .is_none_or(|t| t.tile_type == TileType::Wall),
        ))
    }

    fn builtin_path_ahead(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("path_ahead", args, 0, line)?;
        let (dx, dy) = self.bot.direction.to_offset();
        let pos = Position::new(self.bot.position.x + dx, self.bot.position.y + dy);
        let walkable = match self.grid.get_tile(pos) {
            None => false,
            Some(t) => match t.tile_type {
                TileType::Wall => false,
                TileType::LockedDoor => self.bot.keys > 0,
                _ => true,
            },
        };
        Ok(Value::Bool(walkable))
    }

    fn builtin_gem_here(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("gem_here", args, 0, line)?;
        Ok(Value::Bool(
            self.grid
                .get_tile(self.bot.position)
                .is_some_and(|t| t.item == Some(TileItem::Gem)),
        ))
    }

    fn builtin_has_gem(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("has_gem", args, 0, line)?;
        Ok(Value::Bool(self.bot.gems > 0))
    }

    fn builtin_pit_ahead(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("pit_ahead", args, 0, line)?;
        Ok(Value::Bool(
            self.look_ahead_tile()
                .is_some_and(|t| t.tile_type == TileType::Pit),
        ))
    }

    fn builtin_key_ahead(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("key_ahead", args, 0, line)?;
        Ok(Value::Bool(
            self.look_ahead_tile()
                .is_some_and(|t| t.item == Some(TileItem::Key)),
        ))
    }

    fn builtin_key_here(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("key_here", args, 0, line)?;
        Ok(Value::Bool(
            self.grid
                .get_tile(self.bot.position)
                .is_some_and(|t| t.item == Some(TileItem::Key)),
        ))
    }

    fn builtin_diamond_ahead(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("diamond_ahead", args, 0, line)?;
        Ok(Value::Bool(
            self.look_ahead_tile()
                .is_some_and(|t| t.item == Some(TileItem::Diamond)),
        ))
    }

    fn builtin_diamond_here(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("diamond_here", args, 0, line)?;
        Ok(Value::Bool(
            self.grid
                .get_tile(self.bot.position)
                .is_some_and(|t| t.item == Some(TileItem::Diamond)),
        ))
    }

    fn builtin_has_key(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("has_key", args, 0, line)?;
        Ok(Value::Bool(self.bot.keys > 0))
    }

    fn builtin_has_diamond(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("has_diamond", args, 0, line)?;
        Ok(Value::Bool(self.bot.diamonds > 0))
    }

    fn builtin_inventory(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("inventory", args, 0, line)?;
        Ok(Value::new_dict(vec![
            ("gems".to_string(), Value::Number(self.bot.gems as f64)),
            ("diamonds".to_string(), Value::Number(self.bot.diamonds as f64)),
            ("keys".to_string(), Value::Number(self.bot.keys as f64)),
        ]))
    }

    fn builtin_inventory_count(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("inventory_count", args, 1, line)?;
        let item_type = match &args[0] {
            Value::Str(s) => s.to_lowercase(),
            _ => return Err(self.error(line, "inventory_count needs a string item type")),
        };
        let count = match item_type.as_str() {
            "gems" => self.bot.gems,
            "diamonds" => self.bot.diamonds,
            "keys" => self.bot.keys,
            _ => {
                return Err(self.error(
                    line,
                    format!(
                        "Unknown item type '{}'. Use \"gems\", \"diamonds\", or \"keys\"",
                        item_type
                    ),
                ))
            }
        };
        Ok(Value::Number(count as f64))
    }

    fn builtin_tile_type(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("tile_type", args, 0, line)?;
        let result = match self.grid.get_tile(self.bot.position) {
            None => "wall",
            Some(tile) => match tile.tile_type {
                TileType::Floor => "floor",
                TileType::Wall => "wall",
                TileType::Goal => "goal",
                TileType::Pit => "pit",
                TileType::LockedDoor => "locked_door",
                TileType::GemVault => "gem_vault",
                TileType::DiamondVault => "diamond_vault",
            },
        };
        Ok(Value::new_str(result.to_string()))
    }

    fn builtin_grid_size(&self, args: &[Value], line: u32) -> Result<Value, NyblError> {
        self.expect_args("grid_size", args, 0, line)?;
        Ok(Value::new_array(vec![
            Value::Number(self.grid.width as f64),
            Value::Number(self.grid.height as f64),
        ]))
    }
}

// ─── NyblHost implementation ───────────────────────────────────────────────

impl NyblHost for NyblCodeHost {
    fn call(&mut self, name: &str, args: &[Value], line: u32) -> Option<Result<Value, NyblError>> {
        let result = match name {
            "move" => self.builtin_move(args, line),
            "turn" => self.builtin_turn(args, line),
            "grab" => self.builtin_grab(args, line),
            "drop" => self.builtin_drop(args, line),
            "say" => self.builtin_say(args, line),
            "wait" => self.builtin_wait(args, line),
            "look" => self.builtin_look(args, line),
            "position" => self.builtin_position(args, line),
            "facing" => self.builtin_facing(args, line),
            "gem_ahead" => self.builtin_gem_ahead(args, line),
            "wall_ahead" => self.builtin_wall_ahead(args, line),
            "path_ahead" => self.builtin_path_ahead(args, line),
            "gem_here" => self.builtin_gem_here(args, line),
            "has_gem" => self.builtin_has_gem(args, line),
            "pit_ahead" => self.builtin_pit_ahead(args, line),
            "key_ahead" => self.builtin_key_ahead(args, line),
            "key_here" => self.builtin_key_here(args, line),
            "diamond_ahead" => self.builtin_diamond_ahead(args, line),
            "diamond_here" => self.builtin_diamond_here(args, line),
            "has_key" => self.builtin_has_key(args, line),
            "has_diamond" => self.builtin_has_diamond(args, line),
            "inventory" => self.builtin_inventory(args, line),
            "inventory_count" => self.builtin_inventory_count(args, line),
            "tile_type" => self.builtin_tile_type(args, line),
            "grid_size" => self.builtin_grid_size(args, line),
            _ => return None,
        };
        Some(result)
    }

    fn on_print(&mut self, message: &str) {
        self.actions.push(GameAction {
            line: None,
            action: GameActionKind::Say {
                message: message.to_string(),
            },
        });
    }

    fn resolve_module(&mut self, name: &str) -> Option<Result<String, NyblError>> {
        nybl::stdlib::resolve(name).map(|source| Ok(source.to_string()))
    }

    fn function_hint(&self) -> &str {
        "Available game functions: move, turn, grab, drop, say, wait, look, position, facing"
    }

    fn on_tick(&mut self) -> Result<(), NyblError> {
        if self.puzzle_completed || self.halted {
            Err(NyblError::runtime("halted", 0))
        } else {
            Ok(())
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

pub fn nybl_to_sim_error(e: NyblError) -> SimulationError {
    SimulationError {
        line: e.line,
        column: e.column,
        message: e.message,
        friendly_hint: e.friendly_hint,
    }
}
