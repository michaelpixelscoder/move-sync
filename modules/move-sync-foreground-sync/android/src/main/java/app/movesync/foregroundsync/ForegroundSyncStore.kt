package app.movesync.foregroundsync

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class ForegroundSyncStore(context: Context) : SQLiteOpenHelper(context, "move_sync_foreground.db", null, 1) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE media_ledger (media_key TEXT PRIMARY KEY, uri TEXT NOT NULL, cloud_id TEXT, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, retry_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)")
  }
  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
  fun isUploaded(key: String): Boolean = readableDatabase.rawQuery("SELECT 1 FROM media_ledger WHERE media_key = ? AND state = 'uploaded'", arrayOf(key)).use { it.moveToFirst() }
  fun claim(key: String, uri: String): Boolean {
    val db = writableDatabase
    db.beginTransaction()
    return try {
      if (isUploaded(key)) false else {
        db.execSQL("INSERT OR REPLACE INTO media_ledger(media_key,uri,state,updated_at) VALUES(?,?, 'uploading', ?)", arrayOf(key, uri, System.currentTimeMillis()))
        true
      }.also { db.setTransactionSuccessful() }
    } finally { db.endTransaction() }
  }
  fun uploaded(key: String, cloudId: String) = writableDatabase.execSQL("UPDATE media_ledger SET state='uploaded', cloud_id=?, updated_at=? WHERE media_key=?", arrayOf(cloudId, System.currentTimeMillis(), key))
  fun failed(key: String) = writableDatabase.execSQL("UPDATE media_ledger SET state='failed', attempts=attempts+1, retry_at=?, updated_at=? WHERE media_key=?", arrayOf(System.currentTimeMillis() + 30_000L, System.currentTimeMillis(), key))
}
