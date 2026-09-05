use std::collections::VecDeque;
use std::sync::Mutex;

use log::{Level, LevelFilter, Log, Metadata, Record};

const CAP: usize = 400;

static BUF: Mutex<VecDeque<String>> = Mutex::new(VecDeque::new());
static LOGGER: Logger = Logger;

struct Logger;

impl Log for Logger {
    fn enabled(&self, m: &Metadata) -> bool {
        m.level() <= Level::Info || m.target().starts_with("valostore")
    }

    fn log(&self, r: &Record) {
        if !self.enabled(r.metadata()) {
            return;
        }
        let line = format!(
            "{} {:<5} {}: {}",
            chrono::Local::now().format("%H:%M:%S%.3f"),
            r.level(),
            r.target().rsplit("::").next().unwrap_or(r.target()),
            r.args()
        );
        eprintln!("{line}");
        if let Ok(mut b) = BUF.lock() {
            if b.len() >= CAP {
                b.pop_front();
            }
            b.push_back(line);
        }
    }

    fn flush(&self) {}
}

pub fn install() {
    let _ = log::set_logger(&LOGGER).map(|()| log::set_max_level(LevelFilter::Info));
}

pub fn lines() -> Vec<String> {
    BUF.lock().map(|b| b.iter().cloned().collect()).unwrap_or_default()
}
