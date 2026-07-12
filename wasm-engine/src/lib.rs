use wasm_bindgen::prelude::*;

mod grid;
pub mod solver;
mod types;

#[wasm_bindgen(start)]
pub fn main() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[cfg(test)]
mod tests {
    use super::types::*;
    use ts_rs::TS;

    #[test]
    fn export_types() {
        let cwd = std::env::current_dir().unwrap();
        let out_path = cwd.parent().unwrap().join("src").join("types").join("generated");
        GameState::export_all_to(&out_path).unwrap();
        assert!(out_path.exists(), "Directory was not created at {}", out_path.display());
        assert!(
            out_path.join("GameState.ts").exists(),
            "GameState.ts not found in {}",
            out_path.display()
        );
    }
}
