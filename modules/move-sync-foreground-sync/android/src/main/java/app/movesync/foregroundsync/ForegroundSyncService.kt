package app.movesync.foregroundsync

import android.app.*
import android.content.*
import android.database.ContentObserver
import android.media.MediaMetadataRetriever
import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.*
import android.provider.MediaStore
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** A process-independent media scanner and uploader. JS only supplies its config snapshot. */
class ForegroundSyncService : Service() {
  companion object {
    private const val TAG = "MoveSyncForeground"
    const val ACTION_START = "app.movesync.foregroundsync.START"
    const val ACTION_STOP = "app.movesync.foregroundsync.STOP"
    const val ACTION_PAUSE = "app.movesync.foregroundsync.PAUSE"
    const val ACTION_RESUME = "app.movesync.foregroundsync.RESUME"
    private const val CHANNEL = "move_sync_backup"
    private const val ID = 4107
    private const val PREFS = "move_sync_foreground_config"
    private const val KEY_CONFIG = "config"
    private const val KEY_PAUSED = "paused"
    private const val KEY_RUNNING = "running"
    fun saveConfig(context: Context, config: Map<String, Any?>) {
      val collections = JSONArray()
      (config["collections"] as? List<*>)?.forEach { raw ->
        val item = raw as? Map<*, *> ?: return@forEach
        collections.put(JSONObject().put("localId", item["localId"] as? String).put("collectionId", item["collectionId"] as? String).put("playlistIds", JSONArray(item["playlistIds"] as? List<*> ?: emptyList<String>())))
      }
      val json = JSONObject().put("clientKey", config["clientKey"] as? String).put("convexUrl", config["convexUrl"] as? String).put("onlyOnWifi", config["onlyOnWifi"] as? Boolean ?: true).put("collections", collections)
      context.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_CONFIG, json.toString()).apply()
    }
    fun saveWifiOverride(context: Context, value: Boolean?) { if (value != null) context.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("wifiOverride", value).apply() }
    fun status(context: Context): Map<String, Any> {
      val prefs = context.getSharedPreferences(PREFS, MODE_PRIVATE)
      val config = JSONObject(prefs.getString(KEY_CONFIG, "{}") ?: "{}")
      val ids = (0 until config.optJSONArray("collections")?.length().orZero()).map { config.getJSONArray("collections").getJSONObject(it).optString("localId") }
      return mapOf("running" to prefs.getBoolean(KEY_RUNNING, false), "paused" to prefs.getBoolean(KEY_PAUSED, false), "enabledCollections" to ids, "pending" to 0, "uploaded" to 0)
    }
    private fun Int?.orZero() = this ?: 0
  }

  private val handler = Handler(Looper.getMainLooper())
  private val executor = Executors.newSingleThreadExecutor()
  private val working = AtomicBoolean(false)
  private lateinit var observer: ContentObserver
  private lateinit var store: ForegroundSyncStore
  private var uploaded = 0
  private var pending = 0
  private val reconcile = object : Runnable { override fun run() { scheduleScan(0); handler.postDelayed(this, 5 * 60_000L) } }
  private val scan = Runnable { executor.execute { scanAndUpload() } }

  override fun onBind(intent: Intent?) = null
  override fun onCreate() {
    super.onCreate(); Log.i(TAG, "service onCreate"); store = ForegroundSyncStore(this); createChannel()
    observer = object : ContentObserver(handler) { override fun onChange(selfChange: Boolean, uri: Uri?) { scheduleScan(10_000L) } }
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.i(TAG, "onStartCommand action=${intent?.action}")
    when (intent?.action ?: ACTION_START) {
      ACTION_STOP -> { stopEverything(); return START_NOT_STICKY }
      ACTION_PAUSE -> { prefs().edit().putBoolean(KEY_PAUSED, true).apply(); showNotification("Backup paused"); emit("ForegroundSync:state", mapOf("running" to true, "paused" to true)); return START_NOT_STICKY }
      ACTION_RESUME -> { prefs().edit().putBoolean(KEY_PAUSED, false).apply(); showNotification("Looking for new videos"); emit("ForegroundSync:state", mapOf("running" to true, "paused" to false)); scheduleScan(0) }
      ACTION_START -> startEverything()
    }
    return START_NOT_STICKY // Explicit restart occurs when the user opens the app again.
  }
  private fun startEverything() {
    Log.i(TAG, "startEverything collections=${config().optJSONArray("collections")?.length() ?: 0}")
    if (config().optJSONArray("collections")?.length() != null && config().getJSONArray("collections").length() == 0) { stopEverything(); return }
    prefs().edit().putBoolean(KEY_RUNNING, true).apply(); showNotification("Looking for new videos"); emit("ForegroundSync:state", mapOf("running" to true, "paused" to false))
    contentResolver.registerContentObserver(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, true, observer)
    handler.removeCallbacks(reconcile); handler.post(reconcile)
  }
  private fun stopEverything() {
    handler.removeCallbacksAndMessages(null); try { contentResolver.unregisterContentObserver(observer) } catch (_: Exception) {}
    prefs().edit().putBoolean(KEY_RUNNING, false).putBoolean(KEY_PAUSED, false).apply(); emit("ForegroundSync:state", mapOf("running" to false, "paused" to false)); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf()
  }
  private fun scheduleScan(delay: Long) { if (!prefs().getBoolean(KEY_PAUSED, false)) { handler.removeCallbacks(scan); handler.postDelayed(scan, delay) } }
  private fun scanAndUpload() {
    if (prefs().getBoolean(KEY_PAUSED, false)) { Log.i(TAG, "scan skipped: paused"); return }
    if (!networkAllowed()) { Log.i(TAG, "scan skipped: network not allowed"); return }
    if (!working.compareAndSet(false, true)) return
    try {
      val cfg = config(); val collections = cfg.optJSONArray("collections") ?: return
      Log.i(TAG, "scan started collections=${collections.length()}")
      val byBucket = (0 until collections.length()).associate { val c = collections.getJSONObject(it); c.optString("localId") to c }
      val resolver = contentResolver
      resolver.query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, arrayOf(MediaStore.Video.Media._ID, MediaStore.Video.Media.BUCKET_ID, MediaStore.Video.Media.DATE_MODIFIED, MediaStore.Video.Media.SIZE, MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.MIME_TYPE, MediaStore.Video.Media.DURATION, MediaStore.Video.Media.DATE_TAKEN, MediaStore.Video.Media.WIDTH, MediaStore.Video.Media.HEIGHT), null, null, "${MediaStore.Video.Media.DATE_MODIFIED} DESC")?.use { cursor ->
        val candidates = mutableListOf<MediaRow>()
        while (cursor.moveToNext() && candidates.size < 3) {
          val bucket = cursor.getString(1); val collection = byBucket[bucket] ?: continue
          val id = cursor.getLong(0); val changed = cursor.getLong(2); val size = cursor.getLong(3)
          val key = "video:$id:$changed:$size"; if (store.isUploaded(key)) continue
          candidates.add(MediaRow(key, Uri.withAppendedPath(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id.toString()), cursor.getString(4) ?: "video.mp4", cursor.getString(5) ?: "video/mp4", size, cursor.getLong(6), cursor.getLong(7), cursor.getInt(8), cursor.getInt(9), collection))
        }
        pending = candidates.size; showNotification(if (pending == 0) "Backup is up to date" else "Uploading 0 of $pending"); emit("ForegroundSync:progress", mapOf("pending" to pending, "uploaded" to uploaded))
        Log.i(TAG, "scan found candidates=${candidates.size}")
        candidates.forEachIndexed { index, row -> Log.i(TAG, "upload candidate=${row.filename} size=${row.size}"); upload(row, cfg, index) }
      }
    } catch (error: Exception) { Log.e(TAG, "scan failed", error); showNotification("Backup waiting to retry"); handler.postDelayed(scan, 30_000L) }
    finally { working.set(false) }
  }
  private fun upload(row: MediaRow, cfg: JSONObject, index: Int) {
    if (!store.claim(row.key, row.uri.toString())) return
    try {
      showNotification("Uploading ${index + 1} of $pending")
      val args = JSONObject().put("clientKey", cfg.getString("clientKey")).put("collectionId", row.collection.getString("collectionId")).put("sourceCollectionLocalId", row.collection.getString("localId")).put("localAssetId", row.key).put("filename", row.filename).put("mimeType", row.mime).put("sizeBytes", row.size).put("durationMs", row.duration).put("createdAt", if (row.createdAt > 0) row.createdAt else System.currentTimeMillis()).put("width", row.width).put("height", row.height)
      val mediaId = mutation(cfg, "media:enqueue", args).toString()
      val uploadUrl = mutation(cfg, "media:generateUploadUrl", JSONObject().put("clientKey", cfg.getString("clientKey")).put("id", mediaId)).toString()
      val storageId = uploadFile(uploadUrl, row)
      val thumbnailStorageId = createAndUploadThumbnail(cfg, mediaId, row)
      val completion = args.put("id", mediaId).put("storageId", storageId)
      if (thumbnailStorageId != null) completion.put("thumbnailStorageId", thumbnailStorageId)
      val cloudId = mutation(cfg, "media:completeUpload", completion).toString()
      val playlists = row.collection.optJSONArray("playlistIds") ?: JSONArray()
      for (i in 0 until playlists.length()) mutation(cfg, "playlists:addMedia", JSONObject().put("clientKey", cfg.getString("clientKey")).put("playlistId", playlists.getString(i)).put("mediaIds", JSONArray().put(cloudId)))
      store.uploaded(row.key, cloudId); uploaded++; pending--; showNotification(if (pending > 0) "Uploading ${index + 1} of ${index + 1 + pending}" else "Backup is up to date"); emit("ForegroundSync:uploaded", mapOf("localId" to row.key, "cloudId" to cloudId, "collectionLocalId" to row.collection.getString("localId"))); emit("ForegroundSync:progress", mapOf("pending" to pending, "uploaded" to uploaded))
    } catch (error: Exception) { store.failed(row.key); showNotification("Upload failed; retrying later"); emit("ForegroundSync:error", mapOf("message" to (error.message ?: "Upload failed"), "code" to "UPLOAD_FAILED", "context" to row.key)) }
  }
  private fun mutation(cfg: JSONObject, path: String, args: JSONObject): Any {
    val connection = (URL(cfg.getString("convexUrl").trimEnd('/') + "/api/mutation").openConnection() as HttpURLConnection).apply { requestMethod = "POST"; doOutput = true; setRequestProperty("Content-Type", "application/json"); connectTimeout = 20_000; readTimeout = 60_000 }
    connection.outputStream.use { it.write(JSONObject().put("path", path).put("args", args).put("format", "convex_encoded_json").toString().toByteArray()) }
    val body = (if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream).bufferedReader().use { it.readText() }
    if (connection.responseCode !in 200..299) throw IllegalStateException("Convex $path failed: $body")
    val result = JSONObject(body); if (result.optString("status") != "success") throw IllegalStateException(result.toString()); return result.get("value")
  }
  private fun uploadFile(url: String, row: MediaRow): String {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply { requestMethod = "POST"; doOutput = true; setRequestProperty("Content-Type", row.mime); setFixedLengthStreamingMode(row.size); connectTimeout = 20_000; readTimeout = 0 }
    contentResolver.openInputStream(row.uri)?.use { input -> connection.outputStream.use { output -> input.copyTo(output, 64 * 1024) } } ?: throw IllegalStateException("Unable to read ${row.uri}")
    val body = (if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream).bufferedReader().use { it.readText() }
    if (connection.responseCode !in 200..299) throw IllegalStateException("Storage upload failed: $body")
    return JSONObject(body).getString("storageId")
  }
  private fun createAndUploadThumbnail(cfg: JSONObject, mediaId: String, row: MediaRow): String? {
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(this, row.uri)
      val bitmap = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC) ?: return null
      val bytes = ByteArrayOutputStream().use { output ->
        if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 82, output)) return null
        output.toByteArray()
      }
      if (bytes.isEmpty()) return null
      val url = mutation(cfg, "media:generateUploadUrl", JSONObject().put("clientKey", cfg.getString("clientKey")).put("id", mediaId)).toString()
      uploadBytes(url, bytes)
    } catch (error: Exception) {
      Log.w(TAG, "thumbnail generation skipped for ${row.filename}", error)
      null
    } finally { retriever.release() }
  }
  private fun uploadBytes(url: String, bytes: ByteArray): String {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply { requestMethod = "POST"; doOutput = true; setRequestProperty("Content-Type", "image/jpeg"); setFixedLengthStreamingMode(bytes.size); connectTimeout = 20_000; readTimeout = 60_000 }
    connection.outputStream.use { it.write(bytes) }
    val body = (if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream).bufferedReader().use { it.readText() }
    if (connection.responseCode !in 200..299) throw IllegalStateException("Thumbnail upload failed: $body")
    return JSONObject(body).getString("storageId")
  }
  private fun networkAllowed(): Boolean {
    val cm = getSystemService(ConnectivityManager::class.java); val network = cm.activeNetwork ?: return false; val caps = cm.getNetworkCapabilities(network) ?: return false
    if (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) return false
    return !config().optBoolean("onlyOnWifi", true) || caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
  }
  private fun prefs() = getSharedPreferences(PREFS, MODE_PRIVATE)
  private fun emit(name: String, payload: Map<String, Any?>) { MoveSyncForegroundSyncModule.eventSink?.invoke(name, payload) }
  private fun config() = JSONObject(prefs().getString(KEY_CONFIG, "{}") ?: "{}")
  private fun createChannel() { (getSystemService(NotificationManager::class.java)).createNotificationChannel(NotificationChannel(CHANNEL, "Continuous backup", NotificationManager.IMPORTANCE_LOW)) }
  private fun showNotification(message: String) {
    val open = PendingIntent.getActivity(this, 0, packageManager.getLaunchIntentForPackage(packageName), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    fun action(label: String, command: String, request: Int) = NotificationCompat.Action.Builder(0, label, PendingIntent.getService(this, request, Intent(this, ForegroundSyncService::class.java).setAction(command), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)).build()
    val paused = prefs().getBoolean(KEY_PAUSED, false)
    val notification = NotificationCompat.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.stat_sys_upload).setContentTitle("Move Sync backup").setContentText(message).setContentIntent(open).setOngoing(true).addAction(action(if (paused) "Resume" else "Pause", if (paused) ACTION_RESUME else ACTION_PAUSE, 1)).addAction(action("Stop", ACTION_STOP, 2)).build()
    startForeground(ID, notification)
  }
  data class MediaRow(val key: String, val uri: Uri, val filename: String, val mime: String, val size: Long, val duration: Long, val createdAt: Long, val width: Int, val height: Int, val collection: JSONObject)
}
