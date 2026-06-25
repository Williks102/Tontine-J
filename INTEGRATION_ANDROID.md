# Guide d'Intégration Mobile : Tontine Pro (Express Backend ↔ Kotlin/Compose)

Ce document décrit comment connecter l'application mobile **Tontine Pro (Kotlin / Jetpack Compose)** à l'Actuel Serveur Backend Node.js / Express sécurisé.

---

## 1. Cartographie des API (Routes Existantes)

Le serveur Express expose des points de terminaison RESTful. Toutes les requêtes nécessitant une authentification doivent inclure le jeton JWT dans l'en-tête HTTP sous la forme :  
`Authorization: Bearer <VOTRE_JWT_TOKEN>`

### 🔑 Module Authentification
*   **`POST /api/auth/register`** : Création de compte.
    *   *Payload requis* : `{ "phone": "string", "firstName": "string", "password": "string", "selfie": "string" (base64 optionnel), "referralCode": "string" (optionnel) }`
    *   *Réponse* : `{ "token": "string", "user": { ... } }`
*   **`POST /api/auth/login`** : Connexion par mot de passe.
    *   *Payload requis* : `{ "phone": "string", "password": "string" }`
    *   *Réponse* : `{ "token": "string", "user": { ... } }`
*   **`POST /api/auth/verify`** : Vérification ou création/connexion rapide via numéro de téléphone.
    *   *Payload requis* : `{ "phone": "string", "firstName": "string" (optionnel) }`

### 💼 Carnet de Tontine Individuel (My Card)
*   **`GET /api/cards`** : Récupérer les cartes d'un utilisateur connecté.
    *   *Headers* : `Authorization` requis.
*   **`POST /api/cards`** : Créer une nouvelle grille de tontine individuelle.
    *   *Payload* : `{ "title": "string", "dailyAmount": number, "totalDays": number }`
*   **`POST /api/cards/pay`** : Marquer un jour comme cotisé (pastille violette).
    *   *Payload* : `{ "cardId": "string", "dayIndex": number, "amount": number, "isCommission": boolean }`
*   **`DELETE /api/cards/:id`** : Supprimer un carnet ou réinitialiser.

### 👥 Tontines Collectives (Groups)
*   **`GET /api/groups`** : Récupérer toutes les tontines collectives publiques ouvertes.
*   **`POST /api/groups/join`** : Rejoindre une tontine à un ou deux numéros/positions.
    *   *Payload* : `{ "groupId": "string", "positions": number }`
*   **`GET /api/users/:userId/groups`** : Récupérer la liste des tontines auxquelles un utilisateur participe (`userId` peut être `"me"`).

### 💬 Support & Messagerie
*   **`GET /api/messages/:userId`** : Récupérer la discussion privée (`userId` peut être `"me"`).
*   **`POST /api/messages`** : Envoyer un message d'assistance technique ou communautaire.
    *   *Payload* : `{ "content": "string", "type": "text" }`

### 🎁 Parrainage & Récompenses
*   **`GET /api/referrals/stats`** : Historique et total accumulé des commissions de parrainage.
*   **`GET /api/referrals/relations`** : Liste complète des filleuls invités (Confirmés vs En attente).

---

## 2. Architecture Kotlin / Jetpack Compose

Pour structurer proprement l'application Android, nous recommandons le pattern **MVVM (Model-View-ViewModel)** adossé à un **Repository Pattern** avec injection de dépendances (Hilt ou Koin).

### A. Modèles de Données Kotlin (`data class`)
Définissez des objets clairs correspondants aux structures JSON du backend :

```kotlin
package com.tontinepro.data.model

import com.google.gson.annotations.SerializedName

data class User(
    val id: String,
    val firstName: String,
    val phone: String,
    val referralCode: String,
    val role: String,
    val balance: Double,
    val selfieUrl: String?
)

data class AuthResponse(
    val token: String,
    val user: User
)

data class TontineCard(
    val id: String,
    val userId: String,
    val title: String,
    val dailyAmount: Double,
    val totalDays: Int,
    val status: String, // "active", "completed"
    val createdAt: String,
    val payments: List<CardPayment> = emptyList()
)

data class CardPayment(
    val id: String,
    val cardId: String,
    val dayIndex: Int,
    val amount: Double,
    val isCommission: Int // 1 ou 0
)
```

### B. Client API avec Retrofit / OkHttp
Pour gérer l'authentification automatiquement (Bearer token), utilisez un `Interceptor` OkHttp :

```kotlin
package com.tontinepro.data.api

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

// 1. Intercepteur pour injecter automatiquement le Token JWT
class AuthInterceptor(private val tokenProvider: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val requestBuilder = chain.request().newBuilder()
        tokenProvider()?.let { token ->
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }
        return chain.proceed(requestBuilder.build())
    }
}

// 2. Déclaration de l'interface Retrofit
interface TontineProApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: Map<String, String>): AuthResponse

    @POST("api/auth/register")
    suspend fun register(@Body request: Map<String, String>): AuthResponse

    @GET("api/cards")
    suspend fun getMyCards(): List<TontineCard>

    @POST("api/cards")
    suspend fun createCard(@Body request: Map<String, Any>): TontineCard

    @POST("api/cards/pay")
    suspend fun registerPayment(@Body request: Map<String, Any>): Map<String, Any>
}
```

### C. Repository Pattern
Le Repository fait le pont entre l'API Réseau (Retrofit) et la base de données locale (Room) pour un fonctionnement hors-ligne (Offline-First) :

```kotlin
package com.tontinepro.data.repository

import com.tontinepro.data.api.TontineProApiService
import com.tontinepro.data.model.TontineCard
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class TontineRepository(private val apiService: TontineProApiService) {
    
    fun fetchMyCards(): Flow<Result<List<TontineCard>>> = flow {
        try {
            val response = apiService.getMyCards()
            emit(Result.success(response))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    suspend fun markDayAsPaid(cardId: String, dayIndex: Int, amount: Double): Result<Unit> {
        return try {
            apiService.registerPayment(mapOf(
                "cardId" to cardId,
                "dayIndex" to dayIndex,
                "amount" to amount,
                "isCommission" to false
            ))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

---

## 3. Analyse des Écarts (Gaps) et Recommandations Sec/Tech

Voici les éléments qu'il manque actuellement au backend, ou qui doivent être adaptés pour garantir une intégration mobile de niveau bancaire :

1.  **Chiffrement des Communications (HTTPS)** :
    *   *Problème* : Actuellement, le serveur en mode dev tourne en HTTP classique.
    *   *Solution Mobile* : Android interdit par défaut les flux non chiffrés (Cleartext Traffic). En production, vous devez impérativement configurer un certificat SSL/TLS valide (Let's Encrypt / Certbot sur Cloud Run). Pour le test en local, configurez un fichier `network_security_config.xml` pour autoriser l'IP de votre machine hôte de développement.
2.  **Gestion des OTP Réels (SMS)** :
    *   *Problème* : La route `/api/auth/verify` simule l'OTP ou connecte directement l'utilisateur.
    *   *Recommandation* : Connecter un SDK tiers comme **Twilio** ou **Infobip** pour envoyer des vrais codes OTP à 6 chiffres par SMS, et créer une sous-route `/api/auth/verify-otp` pour valider ce jeton à la place d'une simple validation d'existence.
3.  **Pagination de la Grille Collective** :
    *   *Problème* : La liste des tontines publiques charge l'intégralité de la base de données. Sur un écran mobile, cela peut ralentir le défilement (Infinite Scrolling).
    *   *Recommandation* : Ajouter des paramètres `page` et `limit` sur `GET /api/groups` au niveau d'Express.
4.  **Notifications Push (Firebase Cloud Messaging - FCM)** :
    *   *Problème* : L'utilisateur mobile doit être averti instantanément lorsqu'un membre du cercle a cotisé ou que c'est son tour de ramasser.
    *   *Recommandation* : Ajouter une table `user_push_tokens` et une route `POST /api/users/push-token` pour lier le token FCM généré sur l'appareil mobile à son compte utilisateur sur Express, puis envoyer des payloads de notification lors des clôtures de tontine.
