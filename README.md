# LAB-15-Analyse-Dynamique-Android-Inspection-TLS-HTTPS-et-Gestion-du-SSL-Pinning
Domaine : Mobile Security / Android Pentesting
Niveau : Intermédiaire — Avancé
Durée estimée : 2 à 3 heures
Outils principaux : Frida 17.9.1 · Burp Suite Community Edition v2024.5.5 · Android Emulator (AVD 5554)
 Table des matières

Objectifs du lab
Prérequis
Environnement et outils
Applications cibles
Architecture du lab
Étapes réalisées

Étape 1 — Configuration du proxy Burp Suite
Étape 2 — Injection Frida sur OWASP UnCrackable1
Étape 3 — Bypass SSL sur InsecureBankV2 (script universel)
Étape 4 — Bypass SSL via script personnalisé (OkHttp)
Étape 5 — Configuration du serveur proxy dans l'application
Étape 6 — Bypass avancé avec hook TrustManager
Étape 7 — Traçage natif des fonctions libcrypto.so
Étape 8 — Interception du trafic HTTP dans Burp Suite


Résultats et observations
Concepts clés abordés
Difficultés rencontrées et solutions
Recommandations de sécurité
Références


Objectifs du lab
Ce lab a pour but de maîtriser les techniques d'inspection du trafic TLS/HTTPS sur des applications Android et de contourner les mécanismes de SSL Pinning grâce à l'instrumentation dynamique avec Frida.
À l'issue de ce lab, l'étudiant sera capable de :

✅ Injecter des scripts Frida dans une application Android en cours d'exécution
✅ Utiliser un script de bypass SSL universel (sslpin_bypass_universal.js)
✅ Écrire un script Frida personnalisé ciblant OkHttp ou SSLContext
✅ Hooker TrustManagerFactory.getTrustManagers() pour contourner la validation des certificats
✅ Tracer les fonctions natives de libcrypto.so (X509, TLS handshake)
✅ Configurer Burp Suite comme proxy d'interception HTTP/HTTPS
✅ Capturer et analyser du trafic réseau non chiffré


Prérequis
Connaissances requises

Bases de la sécurité Android (APK, activités, manifest)
Notions de TLS/SSL et infrastructure à clé publique (PKI)
Connaissance basique de JavaScript (pour les scripts Frida)
Utilisation d'un proxy HTTP (Burp Suite)

Logiciels à installer
OutilVersionRôleAndroid Studio + AVDLatestÉmulateur AndroidFrida17.9.1Instrumentation dynamiquefrida-toolsLatestCLI Frida (frida, frida-trace)Burp Suite Communityv2024.5.5Proxy d'interceptionPython3.11+Exécution des outils FridaADBLatestBridge Android Debug
Configuration de l'environnement
bash# Installation de Frida et frida-tools
pip install frida frida-tools

# Vérification de la version
frida --version
# → 17.9.1

# Vérification de la connexion ADB à l'émulateur
adb devices
# → emulator-5554   device
<img width="292" height="92" alt="image" src="https://github.com/user-attachments/assets/592b4c4b-4cb6-4067-ae69-4d10a817ed6c" />

# Démarrage du serveur Frida sur l'émulateur (root requis)
adb root
adb push frida-server /data/local/tmp/
adb shell chmod +x /data/local/tmp/frida-server
adb shell /data/local/tmp/frida-server &



Note : L'IP 10.0.2.2 est l'adresse de la machine hôte vue depuis l'émulateur Android (loopback spécial AVD).


📱 Applications cibles
1. OWASP MSTG UnCrackable1

Package : owasp.mstg.uncrackable1
Activité principale : sg.vantagepoint.uncrackable1.MainActivity
Source : OWASP Mobile Security Testing Guide
Objectif : Application intentionnellement vulnérable utilisée pour pratiquer la rétro-ingénierie et le bypass de contrôles de sécurité

2. InsecureBankV2

Package : com.android.insecurebankv2
Activité principale : com.android.insecurebankv2.LoginActivity
Source : InsecureBankv2 GitHub
Objectif : Application bancaire volontairement vulnérable, couvrant de nombreuses failles OWASP Mobile Top 10




🔍 Étapes réalisées
Étape 1 — Configuration du proxy Burp Suite
Burp Suite Community Edition est configuré comme proxy d'interception pour capturer le trafic HTTP/HTTPS de l'émulateur.
Configuration Burp Suite :

Listener actif sur 0.0.0.0:8080
Certificat CA Burp exporté et installé dans le keystore système de l'émulateur

Configuration proxy sur l'émulateur :

L'application InsecureBankV2 dispose d'une interface dédiée pour configurer le serveur :

Server IP   : 10.0.2.2   ← adresse hôte vue depuis AVD
Server Port : 8888

📷 Voir Image 5 — Interface FilePref de InsecureBankV2

Proxy système Android :
bashadb shell settings put global http_proxy 10.0.2.2:8080
<img width="469" height="759" alt="image" src="https://github.com/user-attachments/assets/9280845e-6ac4-4e23-b30f-62c83cd02817" />

Étape 2 — Injection Frida sur OWASP UnCrackable1
Première injection Frida avec le script universel de bypass SSL sur l'application OWASP UnCrackable1.
Commande exécutée :
powershellfrida -U -f owasp.mstg.uncrackable1 -l sslpin_bypass_universal.js
Résultat :
Connected to Android Emulator 5554 (id=emulator-5554)
Spawned `owasp.mstg.uncrackable1`. Resuming main thread!
[Android Emulator 5554::owasp.mstg.uncrackable1 ]-> [+] Frida script loaded successfully
[+] Activity resumed: sg.vantagepoint.uncrackable1.MainActivity

✅ Le script s'est chargé avec succès. L'application a démarré normalement avec le hook actif.

<img width="1236" height="510" alt="image" src="https://github.com/user-attachments/assets/099d92f0-48a2-420c-904a-1de67f270248" />



Étape 3 — Bypass SSL sur InsecureBankV2 (script universel)
Application du même script universel sur InsecureBankV2, avec un résultat différent selon l'implémentation SSL de l'app.
Commande exécutée :
powershellfrida -U -f com.android.insecurebankv2 -l sslpin_bypass_universal.js
Tentative 1 — Chargement du script :
[+] Frida script loaded successfully
[+] Activity resumed: com.android.insecurebankv2.LoginActivity

📷 Voir  — Script chargé, hook non déclenché immédiatement

<img width="1281" height="517" alt="image" src="https://github.com/user-attachments/assets/a2b0b8a2-466b-42fe-98b3-acdfe4a6df81" />


Tentative 2 — Hook SSLContext activé :
[+] SSL bypass: SSLContext.init patched

✅ Le bypass de SSLContext.init a été appliqué avec succès. Toute validation de certificat passant par SSLContext est désormais neutralisée.

<img width="1450" height="454" alt="image" src="https://github.com/user-attachments/assets/24e1669b-717d-4a02-91b6-d2bdf192227c" />



Étape 4 — Bypass SSL via script personnalisé (OkHttp)
Tentative de bypass avec un script Frida personnalisé ciblant spécifiquement la bibliothèque OkHttp, couramment utilisée dans les applications Android modernes.
Commande exécutée :
powershellfrida -U -f com.android.insecurebankv2 -l C:\Users\lenovo\Desktop\bypass_pinning.js
Sortie du script :
[*] Script Frida chargé. Début du bypass...
[-] OkHttp non trouvé ou configuration différente.

⚠️ Observation : InsecureBankV2 n'utilise pas OkHttp ou sa version n'est pas compatible avec les hooks ciblés. L'application utilise HttpsURLConnection ou une autre implémentation SSL native.


<img width="469" height="759" alt="image" src="https://github.com/user-attachments/assets/9581a2ec-292f-4777-9292-cd4f9de8a4a4" />



Extrait du script bypass_pinning.js :
javascriptJava.perform(function() {
    console.log("[*] Script Frida chargé. Début du bypass...");
    
    try {
        var OkHttpClient = Java.use("okhttp3.OkHttpClient");
        // Hook sur le builder OkHttp
        OkHttpClient.Builder.prototype.build.overload().implementation = function() {
            console.log("[+] OkHttp Builder.build() intercepté");
            // Bypass SSL...
            return this.build();
        };
    } catch(e) {
        console.log("[-] OkHttp non trouvé ou configuration différente.");
    }
});

Étape 5 — Configuration du serveur proxy dans l'application
InsecureBankV2 dispose d'une interface graphique (FilePref) permettant de configurer l'adresse du serveur backend.
Paramètres renseignés :
ChampValeurServer IP10.0.2.2Server Port8888

L'IP 10.0.2.2 redirige le trafic vers la machine hôte où tourne Burp Suite, permettant l'interception des requêtes.


Interface FilePref de l'émulateur Android
<img width="1369" height="784" alt="image" src="https://github.com/user-attachments/assets/30aa6c19-fd0d-48f9-9d85-dcdc2be93d75" />



Étape 6 — Bypass avancé avec hook TrustManager
Utilisation d'un script de bypass réseau global ciblant TrustManagerFactory.getTrustManagers(), une méthode Java centrale dans la validation des certificats TLS.
Sortie observée dans la console Frida :
[*] Injection du bypass réseau global...
[+] [SSL] Bypass TrustManagerFactory.getTrustManagers()
Technique utilisée :
javascriptJava.perform(function() {
    console.log("[*] Injection du bypass réseau global...");
    
    var TrustManagerFactory = Java.use("javax.net.ssl.TrustManagerFactory");
    TrustManagerFactory.getTrustManagers.implementation = function() {
        console.log("[+] [SSL] Bypass TrustManagerFactory.getTrustManagers()");
        // Retourne un TrustManager permissif acceptant tous les certificats
        return [createPermissiveTrustManager()];
    };
});

✅ Ce hook est plus bas niveau et contourne les implémentations SSL qui ne passent pas par SSLContext.init directement.


Console Frida avec autocomplétion et log du bypass
<img width="1568" height="695" alt="image" src="https://github.com/user-attachments/assets/53dd0beb-57ec-4579-baee-79863c2f9b9e" />



Étape 7 — Traçage natif des fonctions libcrypto.so
Utilisation de frida-trace pour tracer les 805 fonctions exportées par libcrypto.so, la bibliothèque OpenSSL native d'Android.
Commande utilisée :
powershellfrida-trace -U -f com.android.insecurebankv2 -I "libcrypto.so"
Résultat :
Started tracing 805 functions. Web UI available at http://localhost:52910/
X509_get_signature_nid: Auto-generated handler at "__handlers__\libcrypto.so\X509_get_signature_nid.js"
X509_sign: Auto-generated handler at "__handlers__\libcrypto.so\X509_sign.js"
X509_gmtime_adj: Auto-generated handler at "__handlers__\libcrypto.so\X509_gmtime_adj.js"
X509_STORE_set_purpose: Auto-generated handler at "...\X509_STORE_set_purpose.js"
...
opening handshake failed
Traceback: websockets.asyncio.server — conn_handler

⚠️ Erreur WebSocket : Le serveur Web UI de frida-trace n'a pas pu établir la connexion WebSocket complète (handshake échoué). Ceci est un problème d'environnement et n'affecte pas le traçage CLI.


Liste des handlers X509 auto-générés

<img width="1568" height="728" alt="image" src="https://github.com/user-attachments/assets/c1e7aae5-4cdb-4c75-bb69-5c149095a58d" />


Fonctions X509 tracées (exemples) :
FonctionDescriptionX509_signSignature d'un certificat X.509X509_get_signature_nidRécupération de l'algorithme de signatureX509_STORE_set_purposeDéfinition de l'usage du certificatX509_VERIFY_PARAM_set_trustParamètre de confiance de vérificationX509_issuer_name_hash_oldHash du nom de l'émetteur (ancien format)

Étape 8 — Interception du trafic HTTP dans Burp Suite
Après application des bypasses SSL et configuration du proxy, le trafic de l'émulateur a été inspecté dans Burp Suite Community Edition v2024.5.5.
Résultat observé dans HTTP History :
#HostMethodURLStatusIP1http://connectivitycheck.gstatic.comGET/generate_204—172.217.18.992http://play.googleapis.comGET/generate_204—216.239.38.223

Burp Suite HTTP History

<img width="1568" height="728" alt="image" src="https://github.com/user-attachments/assets/45b8cc2d-14a9-4b17-a726-695c3ddeb9fe" />




⚠️ Observation : Seules des requêtes de vérification de connectivité Android (/generate_204) ont été interceptées en HTTP. Le trafic HTTPS de l'application n'est pas encore visible dans Burp, indiquant que :

Le bypass SSL est actif mais le proxy système n'est pas encore correctement routé vers Burp
Le certificat CA de Burp nécessite peut-être d'être installé en tant que certificat système (et non utilisateur) sur Android 7+
L'application utilise possiblement du Certificate Transparency ou d'autres mécanismes additionnels



📊 Résultats et observations
ÉtapeApplicationTechniqueRésultatScript universelUnCrackable1sslpin_bypass_universal.js✅ Chargé avec succèsScript universelInsecureBankV2SSLContext.init patched✅ Bypass SSL actifScript OkHttpInsecureBankV2Hook OkHttp personnalisé❌ OkHttp non trouvéTrustManager hookInsecureBankV2getTrustManagers() hooked✅ Bypass global actiffrida-traceInsecureBankV2Trace libcrypto.so✅ 805 fonctions tracéesBurp interceptionInsecureBankV2Proxy HTTP 8080⚠️ HTTP uniquement capturé

💡 Concepts clés abordés
SSL Pinning
Le Certificate Pinning (ou SSL Pinning) est un mécanisme de sécurité qui consiste à associer une application mobile à un certificat TLS spécifique ou à une clé publique spécifique. L'application refuse toute connexion si le certificat présenté ne correspond pas à celui "épinglé" en dur dans le code.
Méthodes de bypass testées dans ce lab :
1. SSLContext.init()          → Neutralise la validation au niveau Java SSL
2. TrustManagerFactory        → Remplace le gestionnaire de confiance
3. OkHttp CertificatePinner   → Désactive l'épinglage OkHttp (N/A ici)
4. libcrypto.so native hooks  → Traçage et hooking au niveau natif
Frida — Dynamic Instrumentation Toolkit
Frida est un framework d'instrumentation dynamique permettant d'injecter du JavaScript dans des processus natifs sur Android, iOS, Windows, Linux et macOS.
Workflow Frida utilisé dans ce lab :
frida CLI
  └── -U          : connexion USB/ADB
  └── -f <pkg>    : spawn (lancement) de l'application
  └── -l <script> : injection du script JS au démarrage

🚧 Difficultés rencontrées et solutions
Problème 1 — OkHttp non trouvé
Symptôme : [-] OkHttp non trouvé ou configuration différente.
Cause : InsecureBankV2 utilise HttpsURLConnection (API Java standard) plutôt qu'OkHttp.
Solution : Utiliser le script universel ciblant SSLContext.init ou TrustManager.
Problème 2 — Erreur WebSocket frida-trace
Symptôme : opening handshake failed lors du traçage
Cause : Conflit sur le port WebSocket local ou problème réseau entre frida-server et l'hôte.
Solution : Ignorer l'interface Web UI et utiliser uniquement les logs CLI ; s'assurer qu'aucun pare-feu ne bloque le port 52910.
Problème 3 — Burp ne capture que le HTTP
Symptôme : Seules les requêtes /generate_204 apparaissent dans Burp HTTP History.
Cause probable : Sur Android 7+, les certificats CA utilisateur ne sont plus approuvés par défaut pour les applications. Le certificat Burp doit être installé en tant que certificat système.
Solution :
bash# Convertir le certificat Burp en format système
openssl x509 -inform DER -in burp.der -out burp.pem
CERT_HASH=$(openssl x509 -inform PEM -subject_hash_old -in burp.pem | head -1)
mv burp.pem ${CERT_HASH}.0

# Pousser vers le store système (root requis)
adb root
adb remount
adb push ${CERT_HASH}.0 /system/etc/security/cacerts/
adb shell chmod 644 /system/etc/security/cacerts/${CERT_HASH}.0
adb reboot
Problème 4 — "Window too small" dans le terminal Frida
Symptôme : Message répété Window too small...
Cause : La fenêtre PowerShell est trop étroite pour l'interface REPL de Frida.
Solution : Agrandir la fenêtre du terminal ou utiliser Windows Terminal.

🛡️ Recommandations de sécurité
Ces vulnérabilités observées en lab permettent de formuler les recommandations suivantes pour sécuriser une application Android en production :

Implémenter un SSL Pinning robuste via Android Network Security Config (network_security_config.xml) combiné avec un pinning programmatique.
Utiliser OkHttp avec CertificatePinner pour épingler la clé publique du certificat serveur :

kotlin   val certificatePinner = CertificatePinner.Builder()
       .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
       .build()

Détecter la présence de Frida à l'exécution via des vérifications anti-tampering (détection du port Frida 27042, vérification de l'intégrité des processus).
Activer le Certificate Transparency pour renforcer la chaîne de confiance PKI.
Ne pas stocker d'informations sensibles dans les SharedPreferences ou fichiers non chiffrés (comme le fait InsecureBankV2 de manière intentionnelle).
Implémenter une détection de root pour refuser l'exécution sur des appareils rootés où le bypass est trivial.


📚 Références
RessourceLienOWASP MSTGhttps://owasp.org/www-project-mobile-security-testing-guide/Frida Documentationhttps://frida.re/docs/home/InsecureBankV2https://github.com/dineshshetty/Android-InsecureBankv2OWASP UnCrackable Appshttps://github.com/OWASP/owasp-mstg/tree/master/CrackmesAndroid Network Security Confighttps://developer.android.com/training/articles/security-configBurp Suite Mobile Testinghttps://portswigger.net/burp/documentation/desktop/mobilesslpin_bypass_universal.jshttps://github.com/httptoolkit/frida-android-unpinning

🖼️ Captures d'écran du lab
ImageDescriptionImage 1Frida 17.9.1 — Injection réussie sur OWASP UnCrackable1Image 2Frida — Script universel chargé sur InsecureBankV2Image 3Frida — SSLContext.init patché sur InsecureBankV2Image 4Script bypass OkHttp — OkHttp non trouvéImage 5Emulateur — Configuration proxy IP/Port dans FilePrefImage 6Frida REPL — Bypass TrustManagerFactory.getTrustManagers() actifImage 7frida-trace — 805 fonctions libcrypto.so tracéesImage 8Burp Suite — HTTP History avec traffic Android capturé

Lab réalisé dans un environnement contrôlé à des fins éducatives. Toute utilisation de ces techniques sur des applications sans autorisation explicite est illégale.


Date : Juin 2026
Module : Sécurité Mobile Android
