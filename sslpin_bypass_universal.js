Java.perform(function() {
    console.log("[*] Script de bypass universel + natif chargé. Initialisation...");

    // =================================================================
    // CONTRE-MESURES SÉCURITÉ RESEAU JAVA (Couche Applicative)
    // =================================================================

    // 1. Hook de SSLContext.init (Ce qui a fonctionné au coup d'avant)
    try {
        var SSLContext = Java.use('javax.net.ssl.SSLContext');
        SSLContext.init.overload('[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom').implementation = function(km, tm, sr) {
            console.log("[+] SSL bypass: SSLContext.init patched (Java)");
            // On passe 'null' pour bypasser la chaîne de confiance
            return this.init(km, null, sr);
        };
    } catch (e) {
        console.log("[-] Impossible de patcher SSLContext.init : " + e);
    }

    // 2. Hook générique de TrustManagerFactory
    try {
        var TrustManagerFactory = Java.use('javax.net.ssl.TrustManagerFactory');
        TrustManagerFactory.getTrustManagers.implementation = function() {
            console.log("[+] [Java] TrustManagerFactory.getTrustManagers() bypassé");
            return this.getTrustManagers();
        };
    } catch (e) {}


    // =================================================================
    // CONTRE-MESURES SÉCURITÉ NATIVE (Couche OpenSSL / BoringSSL)
    // =================================================================
    
    // Remplacement du code qui causait l'erreur "TypeError: not a function"
    try {
        var nativeFuncAddr = Module.findExportByName(null, 'SSL_get_verify_result');
        
        if (nativeFuncAddr && !nativeFuncAddr.isNull()) {
            Interceptor.attach(nativeFuncAddr, {
                onLeave: function(retval) {
                    console.log('[+] [Natif] SSL_get_verify_result détecté ! Forçage à X509_V_OK (0)');
                    retval.replace(ptr(0)); // 0 = Succès de la validation
                }
            });
            console.log('[+] Hook natif posé avec succès sur SSL_get_verify_result');
        } else {
            console.log('[-] SSL_get_verify_result non trouvée en mémoire (Normal si l\'app utilise du Java pur)');
        }
    } catch (e) {
        console.log('[-] Erreur lors de l\'analyse des symboles natifs : ' + e);
    }
});