use nybl::{NyblError, NyblHost, NyblLimits, Value};

use crate::host::nybl_to_sim_error;
use crate::models::PlaygroundResult;

#[derive(Default)]
struct PlaygroundHost {
    output: Vec<String>,
}

impl NyblHost for PlaygroundHost {
    fn call(
        &mut self,
        _name: &str,
        _args: &[Value],
        _line: u32,
    ) -> Option<Result<Value, NyblError>> {
        None
    }

    fn on_print(&mut self, message: &str) {
        self.output.push(message.to_string());
    }

    fn resolve_module(&mut self, name: &str) -> Option<Result<String, NyblError>> {
        nybl::stdlib::resolve(name).map(|source| Ok(source.to_string()))
    }

    fn function_hint(&self) -> &str {
        "Use Nybl's built-in functions, print(), or a function from an imported std.* module."
    }
}

pub fn run(code: &str) -> PlaygroundResult {
    let mut host = PlaygroundHost::default();
    let error = nybl_vm::run(code, &mut host, &NyblLimits::standard())
        .err()
        .map(nybl_to_sim_error);

    PlaygroundResult {
        output: host.output,
        error,
    }
}

#[cfg(test)]
mod tests {
    use super::run;

    #[test]
    fn captures_multiple_prints() {
        let result = run("print(\"hello\")\nprint(1, 2, 3)");

        assert_eq!(result.output, vec!["hello", "1 2 3"]);
        assert!(result.error.is_none());
    }

    #[test]
    fn resolves_bundled_standard_library_modules() {
        let result = run("use std.math\nprint(clamp(12, 0, 10))");

        assert_eq!(result.output, vec!["10"]);
        assert!(result.error.is_none());
    }

    #[test]
    fn preserves_output_written_before_an_error() {
        let result = run("print(\"before\")\nmissing_function()");

        assert_eq!(result.output, vec!["before"]);
        let error = result.error.expect("the unknown function should fail");
        assert_eq!(error.line, Some(2));
        assert!(!error.message.is_empty());
        assert!(error.friendly_hint.is_some());
    }

    #[test]
    fn enforces_standard_resource_limits() {
        let result = run("while true { }");

        let error = result.error.expect("the infinite loop should be stopped");
        assert!(
            error.message.to_lowercase().contains("step")
                || error.message.to_lowercase().contains("limit"),
            "unexpected resource-limit error: {}",
            error.message
        );
    }
}
