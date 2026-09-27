package app.movesync.foregroundsync

import android.content.Context
import android.content.Intent
import android.Manifest
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class MoveSyncForegroundSyncModule : Module() {
  companion object {
    private const val TAG = "MoveSyncForeground"
    @Volatile var eventSink: ((String, Map<String, Any?>) -> Unit)? = null
  }
  override fun definition() = ModuleDefinition {
    Name("MoveSyncForegroundSync")
    Events("ForegroundSync:state", "ForegroundSync:progress", "ForegroundSync:uploaded", "ForegroundSync:error")
    OnCreate { eventSink = { name, payload -> sendEvent(name, payload) } }
    OnDestroy { eventSink = null }
    Function("configure") { config: Map<String, Any?> ->
      Log.i(TAG, "configure called collections=${(config["collections"] as? List<*>)?.size ?: 0}")
      appContext.reactContext?.let { ForegroundSyncService.saveConfig(it, config) }
    }
    AsyncFunction("start") { options: Map<String, Any?>? ->
      val context = appContext.reactContext ?: throw IllegalStateException("Application context unavailable")
      Log.i(TAG, "start called")
      ForegroundSyncService.saveWifiOverride(context, options?.get("onlyOnWifi") as? Boolean)
      ContextCompat.startForegroundService(context, Intent(context, ForegroundSyncService::class.java).setAction(ForegroundSyncService.ACTION_START))
      Unit
    }
    AsyncFunction("stop") {
      Log.i(TAG, "stop called")
      appContext.reactContext?.let { context ->
        context.startService(Intent(context, ForegroundSyncService::class.java).setAction(ForegroundSyncService.ACTION_STOP))
        Unit
      }
    }
    AsyncFunction("setPaused") { paused: Boolean ->
      appContext.reactContext?.let { context ->
        context.startService(Intent(context, ForegroundSyncService::class.java).setAction(if (paused) ForegroundSyncService.ACTION_PAUSE else ForegroundSyncService.ACTION_RESUME))
        Unit
      }
    }
    AsyncFunction("requestNotificationPermission") { promise: Promise ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Application context unavailable")
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
        promise.resolve(mapOf("status" to "granted"))
      } else {
        Permissions.askForPermissionsWithPermissionsManager(
          appContext.permissions,
          promise,
          Manifest.permission.POST_NOTIFICATIONS,
        )
      }
    }
    AsyncFunction("getStatus") {
      val context = appContext.reactContext ?: throw IllegalStateException("Application context unavailable")
      ForegroundSyncService.status(context)
    }
  }
}
