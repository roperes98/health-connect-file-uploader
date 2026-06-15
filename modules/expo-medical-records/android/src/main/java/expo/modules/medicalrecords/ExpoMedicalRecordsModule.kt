package expo.modules.medicalrecords

import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.ExperimentalPersonalHealthRecordApi
import androidx.health.connect.client.records.MedicalDataSource
import androidx.health.connect.client.records.FhirVersion
import androidx.health.connect.client.request.CreateMedicalDataSourceRequest
import androidx.health.connect.client.request.UpsertMedicalResourceRequest
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@OptIn(ExperimentalPersonalHealthRecordApi::class)
class ExpoMedicalRecordsModule : Module() {
  private val coroutineScope = CoroutineScope(Dispatchers.Default)

  override fun definition() = ModuleDefinition {
    Name("ExpoMedicalRecords")

    AsyncFunction("writeMedicalResource") { fhirData: String, promise: Promise ->
      val context = appContext.reactContext ?: return@AsyncFunction promise.reject("ERR_NO_CONTEXT", "React context is null", null)

      coroutineScope.launch {
        try {
          val healthConnectClient = HealthConnectClient.getOrCreate(context)

          val medicalDataSource = healthConnectClient.createMedicalDataSource(
              CreateMedicalDataSourceRequest(
                  fhirBaseUri = Uri.parse("https://health.google.com/"),
                  displayName = "Expo Medical Records Uploader - " + System.currentTimeMillis(),
                  fhirVersion = FhirVersion(4, 0, 1)
              )
          )

          healthConnectClient.upsertMedicalResources(
              listOf(
                  UpsertMedicalResourceRequest(
                      dataSourceId = medicalDataSource.id,
                      fhirVersion = medicalDataSource.fhirVersion,
                      data = fhirData
                  )
              )
          )

          promise.resolve("SUCCESS")
        } catch (e: Exception) {
          promise.reject("ERR_WRITE", e.message ?: "Unknown error", e)
        }
      }
    }
  }
}
