    @app.tauri.annotation.ActivityCallback <methods>;
    @app.tauri.annotation.Command <methods>;
    @app.tauri.annotation.PermissionCallback <methods>;
-dontwarn com.google.api.client.http.GenericUrl
-dontwarn com.google.api.client.http.HttpHeaders
-dontwarn com.google.api.client.http.HttpRequest
-dontwarn com.google.api.client.http.HttpRequestFactory
-dontwarn com.google.api.client.http.HttpResponse
-dontwarn com.google.api.client.http.HttpTransport
-dontwarn com.google.api.client.http.javanet.NetHttpTransport
-dontwarn com.google.api.client.http.javanet.NetHttpTransport$Builder
-dontwarn javax.annotation.**
-dontwarn javax.annotation.Nullable
-dontwarn javax.annotation.concurrent.GuardedBy
-dontwarn org.joda.time.Instant
-keep @app.tauri.annotation.TauriPlugin class * { *; }
-keep class app.valostore.auth.** { *; }
-keepclassmembers class * {
}
