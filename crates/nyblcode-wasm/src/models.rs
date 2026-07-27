use serde::{Deserialize, Serialize};

// ─── World Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorldTheme {
    GrassyPlains,
    CrystalCaves,
    AbandonedStation,
    VolcanicIslands,
    CloudCity,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorldUnlock {
    Open,
    AfterLevels { count: u32 },
    AfterWorld { world_id: String },
}

// ─── Position & Direction ────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

impl Position {
    pub fn new(x: i32, y: i32) -> Self {
        Self { x, y }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Up,
    Down,
    Left,
    Right,
}

impl Direction {
    pub fn to_offset(&self) -> (i32, i32) {
        match self {
            Direction::Up => (0, -1),
            Direction::Down => (0, 1),
            Direction::Left => (-1, 0),
            Direction::Right => (1, 0),
        }
    }

    pub fn turn_left(&self) -> Direction {
        match self {
            Direction::Up => Direction::Left,
            Direction::Left => Direction::Down,
            Direction::Down => Direction::Right,
            Direction::Right => Direction::Up,
        }
    }

    pub fn turn_right(&self) -> Direction {
        match self {
            Direction::Up => Direction::Right,
            Direction::Right => Direction::Down,
            Direction::Down => Direction::Left,
            Direction::Left => Direction::Up,
        }
    }

    pub fn opposite(&self) -> Direction {
        match self {
            Direction::Up => Direction::Down,
            Direction::Down => Direction::Up,
            Direction::Left => Direction::Right,
            Direction::Right => Direction::Left,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TileType {
    Floor,
    Wall,
    Goal,
    Pit,
    LockedDoor,
    GemVault,
    DiamondVault,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TileItem {
    Gem,
    Key,
    Diamond,
}

// ─── Tile ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tile {
    pub tile_type: TileType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub item: Option<TileItem>,
}

impl Tile {
    pub fn floor() -> Self {
        Self {
            tile_type: TileType::Floor,
            item: None,
        }
    }

    pub fn wall() -> Self {
        Self {
            tile_type: TileType::Wall,
            item: None,
        }
    }

    pub fn goal() -> Self {
        Self {
            tile_type: TileType::Goal,
            item: None,
        }
    }

    pub fn with_gem(mut self) -> Self {
        self.item = Some(TileItem::Gem);
        self
    }

    pub fn has_gem(&self) -> bool {
        self.item == Some(TileItem::Gem)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Grid {
    pub width: u32,
    pub height: u32,
    pub tiles: Vec<Vec<Tile>>,
}

impl Grid {
    pub fn new(width: u32, height: u32) -> Self {
        let tiles = (0..height)
            .map(|_| (0..width).map(|_| Tile::floor()).collect())
            .collect();
        Self {
            width,
            height,
            tiles,
        }
    }

    pub fn get_tile(&self, pos: Position) -> Option<&Tile> {
        if pos.x < 0 || pos.y < 0 {
            return None;
        }
        self.tiles
            .get(pos.y as usize)
            .and_then(|row| row.get(pos.x as usize))
    }

    pub fn get_tile_mut(&mut self, pos: Position) -> Option<&mut Tile> {
        if pos.x < 0 || pos.y < 0 {
            return None;
        }
        self.tiles
            .get_mut(pos.y as usize)
            .and_then(|row| row.get_mut(pos.x as usize))
    }

    pub fn is_walkable(&self, pos: Position) -> bool {
        self.get_tile(pos)
            .map(|t| !matches!(t.tile_type, TileType::Wall | TileType::LockedDoor))
            .unwrap_or(false)
    }

    pub fn set_tile(&mut self, pos: Position, tile: Tile) {
        if let Some(t) = self.get_tile_mut(pos) {
            *t = tile;
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotState {
    pub position: Position,
    pub direction: Direction,
    #[serde(default)]
    pub gems: u32,
    #[serde(default)]
    pub diamonds: u32,
    #[serde(default)]
    pub keys: u32,
    #[serde(default)]
    pub gems_deposited: u32,
    #[serde(default)]
    pub diamonds_deposited: u32,
    pub message: Option<String>,
}

impl BotState {
    pub fn new(position: Position, direction: Direction) -> Self {
        Self {
            position,
            direction,
            gems: 0,
            diamonds: 0,
            keys: 0,
            gems_deposited: 0,
            diamonds_deposited: 0,
            message: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameAction {
    pub line: Option<u32>,
    pub action: GameActionKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum GameActionKind {
    Move {
        from: Position,
        to: Position,
        direction: Direction,
    },
    Turn {
        from: Direction,
        to: Direction,
    },
    Grab {
        position: Position,
    },
    Drop {
        position: Position,
    },
    Say {
        message: String,
    },
    Wait {
        ticks: u32,
    },
    Error {
        message: String,
    },
    FallIntoPit {
        position: Position,
    },
    Unlock {
        position: Position,
    },
    Deposit {
        position: Position,
        item: TileItem,
    },
    Bump {
        position: Position,
        direction: Direction,
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationError {
    pub line: Option<u32>,
    pub column: Option<u32>,
    pub message: String,
    pub friendly_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResult {
    pub actions: Vec<GameAction>,
    pub final_state: BotState,
    pub final_grid: Grid,
    pub puzzle_completed: bool,
    pub stars_met: Vec<bool>,
    pub error: Option<SimulationError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PuzzleObjective {
    ReachPosition { x: i32, y: i32 },
    CollectAllGems,
    DepositAllGems,
    DepositAllDiamonds,
    MaxInstructions { instructions: u32 },
    MaxSteps { steps: u32 },
    All { conditions: Vec<PuzzleObjective> },
}

impl PuzzleObjective {
    pub fn is_met(&self, bot: &BotState, grid: &Grid, instructions: u32, steps: u32) -> bool {
        match self {
            Self::ReachPosition { x, y } => bot.position.x == *x && bot.position.y == *y,
            Self::CollectAllGems => !grid.tiles.iter().any(|row| row.iter().any(|t| t.has_gem())),
            Self::DepositAllGems => {
                !grid.tiles.iter().any(|row| row.iter().any(|t| t.has_gem())) && bot.gems == 0
            }
            Self::DepositAllDiamonds => {
                !grid
                    .tiles
                    .iter()
                    .any(|row| row.iter().any(|t| t.item == Some(TileItem::Diamond)))
                    && bot.diamonds == 0
            }
            Self::MaxInstructions { instructions: max } => instructions <= *max,
            Self::MaxSteps { steps: max } => steps <= *max,
            Self::All { conditions } => conditions
                .iter()
                .all(|c| c.is_met(bot, grid, instructions, steps)),
        }
    }

    pub fn description(&self) -> String {
        match self {
            PuzzleObjective::ReachPosition { x, y } => {
                format!("Reach position ({}, {})", x, y)
            }
            PuzzleObjective::CollectAllGems => "Collect all gems".to_string(),
            PuzzleObjective::DepositAllGems => "Deposit all gems at gem vaults".to_string(),
            PuzzleObjective::DepositAllDiamonds => {
                "Deposit all diamonds at diamond vaults".to_string()
            }
            PuzzleObjective::MaxInstructions { instructions } => {
                format!("Use {} instructions or fewer", instructions)
            }
            PuzzleObjective::MaxSteps { steps } => {
                format!("Complete in {} steps or fewer", steps)
            }
            PuzzleObjective::All { conditions } => conditions
                .iter()
                .map(|c| c.description())
                .collect::<Vec<_>>()
                .join(" AND "),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PuzzleConfig {
    pub puzzle_id: String,
    pub title: String,
    pub description: String,
    pub grid: Grid,
    pub bot_start: BotState,
    pub completion: PuzzleObjective,
    pub star_objectives: Vec<PuzzleObjective>,
    pub starter_code: String,
    pub hint: Option<String>,
    pub tutorial: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub theme: Option<WorldTheme>,
}

// ─── Frontend query types ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldInfo {
    pub world_id: String,
    pub title: String,
    pub description: String,
    pub story_intro: String,
    pub theme: WorldTheme,
    pub sort_order: u32,
    pub unlock: WorldUnlock,
    pub level_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LevelSummary {
    pub puzzle_id: String,
    pub title: String,
    pub description: String,
}
