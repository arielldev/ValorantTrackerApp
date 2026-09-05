use std::path::Path;

use base64::Engine;
use jni::objects::{JClass, JString};
use jni::sys::jstring;
use jni::JNIEnv;

use crate::background::{self, Mode};

fn jstr(env: &mut JNIEnv, s: &JString) -> String {
    env.get_string(s).map(|v| v.into()).unwrap_or_default()
}

#[no_mangle]
pub extern "system" fn Java_app_valostore_auth_ShopCheckWorker_nativeCheck<'l>(
    mut env: JNIEnv<'l>,
    _class: JClass<'l>,
    data_dir: JString<'l>,
    cookies: JString<'l>,
    key_b64: JString<'l>,
    mode: JString<'l>,
) -> jstring {
    let data_dir = jstr(&mut env, &data_dir);
    let cookies = jstr(&mut env, &cookies);
    let key_b64 = jstr(&mut env, &key_b64);
    let mode = Mode::parse(&jstr(&mut env, &mode));

    let result = (|| -> Result<serde_json::Value, String> {
        let bytes = base64::engine::general_purpose::STANDARD.decode(key_b64.trim()).map_err(|e| e.to_string())?;
        if bytes.len() != 32 {
            return Err("bad vault key".into());
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&bytes);
        let rt = tokio::runtime::Builder::new_current_thread().enable_all().build().map_err(|e| e.to_string())?;
        let outcome = rt.block_on(background::run(Path::new(&data_dir), &cookies, key, mode)).map_err(|e| e.to_string())?;
        Ok(serde_json::json!({
            "ok": true,
            "cookies": outcome.cookies,
            "notices": outcome.notices,
        }))
    })();

    let json = match result {
        Ok(v) => v,
        Err(e) => serde_json::json!({ "ok": false, "error": e }),
    };
    match env.new_string(json.to_string()) {
        Ok(s) => s.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}
